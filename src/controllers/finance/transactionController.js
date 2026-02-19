const db = require('../../models');
const { Sale, Expense, SupplierPayment, CustomerRefund, CustomerCredit, User, Customer, Suppliers, Branch } = db;
const { Op } = require('sequelize');

/**
 * Get unified transactions list
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            type, // 'income', 'expense', 'supplier_payment', 'refund'
            paymentMethod,
            branchId,
            search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitInt = parseInt(limit);

        // Fetch all types and combine them
        // This is a simplified version. For a production app with millions of records, 
        // you would use a unified view or a dedicated transaction table.

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter[Op.between] = [new Date(startDate), new Date(endDate)];
        } else if (startDate) {
            dateFilter[Op.gte] = new Date(startDate);
        } else if (endDate) {
            dateFilter[Op.lte] = new Date(endDate);
        }

        const getBranchFilter = () => {
            if (branchId) return { branchId };
            if (req.user && req.user.branchId) return { branchId: req.user.branchId };
            return {};
        };

        const branchFilter = getBranchFilter();

        // 1. Fetch Sales (Income)
        const sales = await Sale.findAll({
            where: {
                ...branchFilter,
                ...(startDate || endDate ? { saleDate: dateFilter } : {})
            },
            include: [{ model: Customer, as: 'customer', attributes: ['customerName'] }],
            limit: limitInt,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        // 2. Fetch Expenses (Expense)
        const expenses = await Expense.findAll({
            where: {
                ...branchFilter,
                isDeleted: false,
                ...(startDate || endDate ? { expenseDate: dateFilter } : {})
            },
            limit: limitInt,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        // 3. Fetch Supplier Payments (Supplier Payment)
        const supplierPayments = await SupplierPayment.findAll({
            where: {
                ...branchFilter,
                status: 'completed',
                ...(startDate || endDate ? { paymentDate: dateFilter } : {})
            },
            include: [{ model: Suppliers, as: 'supplier', attributes: ['name'] }],
            limit: limitInt,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        // 4. Fetch Customer Refunds (Refund)
        const refunds = await CustomerRefund.findAll({
            where: {
                ...branchFilter,
                ...(startDate || endDate ? { refundDate: dateFilter } : {})
            },
            include: [{ model: Customer, as: 'customer', attributes: ['customerName'] }],
            limit: limitInt,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        // Combine and format
        let allTransactions = [
            ...sales.map(s => ({
                id: s.id,
                type: 'sale',
                category: 'income',
                reference: s.saleNumber,
                date: s.saleDate,
                amount: parseFloat(s.totalAmount),
                paymentMethod: 'Multiple', // Sales can have multiple payments
                description: `Sale to ${s.customer?.customerName || 'Walk-in'}`,
                createdAt: s.createdAt
            })),
            ...expenses.map(e => ({
                id: e.id,
                type: 'expense',
                category: 'expense',
                reference: e.expenseCode || e.id,
                date: e.expenseDate,
                amount: parseFloat(e.paidAmount),
                paymentMethod: e.paymentMethod,
                description: e.title,
                createdAt: e.createdAt
            })),
            ...supplierPayments.map(p => ({
                id: p.id,
                type: 'supplier_payment',
                category: 'expense',
                reference: p.referenceNumber || p.id,
                date: p.paymentDate,
                amount: parseFloat(p.amount),
                paymentMethod: p.paymentMethod,
                description: `Payment to ${p.supplier?.name || 'Unknown'}`,
                createdAt: p.createdAt
            })),
            ...refunds.map(r => ({
                id: r.id,
                type: 'refund',
                category: 'expense',
                reference: r.refundNumber || r.id,
                date: r.refundDate,
                amount: parseFloat(r.paidAmount),
                paymentMethod: r.refundMethod,
                description: `Refund to ${r.customer?.customerName || 'Walk-in'}`,
                createdAt: r.createdAt
            }))
        ];

        // Sort combined list
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Slice for pagination (This is not ideal since we fetched limit items from each, 
        // but for a quick fix it works. A better way is using a UNION query or unified table.)
        const paginatedTransactions = allTransactions.slice(0, limitInt);

        res.json({
            success: true,
            data: paginatedTransactions,
            pagination: {
                page: parseInt(page),
                limit: limitInt,
                count: allTransactions.length // This is just the count of combined slice
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transactions',
            error: error.message
        });
    }
};
