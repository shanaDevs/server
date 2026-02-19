const db = require('../../models');
const { Sale, SaleItem, SalePayment, Payment, Customer, Product, User } = db;
const { Op, fn, col, literal } = require('sequelize');
const ExcelJS = require('exceljs');

/**
 * Helper to get date range based on period
 */
const getDateRange = (period, date) => {
    const start = new Date(date || new Date());
    const end = new Date(date || new Date());

    switch (period?.toLowerCase()) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'annually':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};

/**
 * Get Sales Statistics
 */
exports.getSalesStatistics = async (req, res) => {
    try {
        const { period = 'daily', date, branchId } = req.query;
        const { start, end } = getDateRange(period, date);

        const where = {
            saleDate: { [Op.between]: [start, end] },
            isDeleted: false
        };

        if (branchId) where.branchId = branchId;
        else if (req.branchId) where.branchId = req.branchId;

        const stats = await Sale.findOne({
            where,
            attributes: [
                [fn('COUNT', col('id')), 'totalSales'],
                [fn('SUM', col('total_amount')), 'totalRevenue'],
                [fn('SUM', col('total_cost')), 'totalCost'],
                [fn('SUM', col('profit')), 'totalProfit'],
                [fn('SUM', col('discount_amount')), 'totalDiscount'],
                [fn('SUM', col('tax_amount')), 'totalTax'],
                [fn('AVG', col('profit_margin')), 'avgProfitMargin']
            ],
            raw: true
        });

        const paymentBreakdown = await SalePayment.findAll({
            include: [{
                model: Sale,
                as: 'sale',
                attributes: [],
                where: {
                    saleDate: { [Op.between]: [start, end] },
                    isDeleted: false,
                    ...(where.branchId ? { branchId: where.branchId } : {})
                }
            }],
            attributes: [
                'paymentMethod',
                [fn('SUM', col('SalePayment.amount')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        res.json({
            success: true,
            period,
            range: { start, end },
            data: {
                summary: {
                    totalSales: parseInt(stats.totalSales) || 0,
                    totalRevenue: parseFloat(stats.totalRevenue) || 0,
                    totalCost: parseFloat(stats.totalCost) || 0,
                    totalProfit: parseFloat(stats.totalProfit) || 0,
                    totalDiscount: parseFloat(stats.totalDiscount) || 0,
                    totalTax: parseFloat(stats.totalTax) || 0,
                    avgProfitMargin: parseFloat(stats.avgProfitMargin) || 0
                },
                payments: paymentBreakdown.map(p => ({
                    method: p.paymentMethod,
                    amount: parseFloat(p.total) || 0
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching sales stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching sales statistics', error: error.message });
    }
};

/**
 * Get Payment Statistics
 */
exports.getPaymentStatistics = async (req, res) => {
    try {
        const { period = 'daily', date, branchId } = req.query;
        const { start, end } = getDateRange(period, date);

        const where = {
            paidDate: { [Op.between]: [start, end] },
            isCancelled: false
        };

        if (branchId) where.branchId = branchId;
        else if (req.branchId) where.branchId = req.branchId;

        const stats = await Payment.findOne({
            where,
            attributes: [
                [fn('COUNT', col('id')), 'totalPayments'],
                [fn('SUM', col('amount_paid')), 'totalAmount']
            ],
            raw: true
        });

        const byMethod = await Payment.findAll({
            where,
            attributes: [
                'paymentMethod',
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('amount_paid')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        res.json({
            success: true,
            period,
            range: { start, end },
            data: {
                totalPayments: parseInt(stats.totalPayments) || 0,
                totalAmount: parseFloat(stats.totalAmount) || 0,
                methods: byMethod.map(m => ({
                    method: m.paymentMethod,
                    count: parseInt(m.count),
                    total: parseFloat(m.total)
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching payment stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment statistics', error: error.message });
    }
};

/**
 * Export Sales to Excel
 */
exports.exportSalesExcel = async (req, res) => {
    try {
        const { period = 'daily', date, branchId } = req.query;
        const { start, end } = getDateRange(period, date);

        const where = {
            saleDate: { [Op.between]: [start, end] },
            isDeleted: false
        };

        if (branchId) where.branchId = branchId;
        else if (req.branchId) where.branchId = req.branchId;

        const sales = await Sale.findAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['customerName', 'phone'] },
                { model: User, as: 'cashier', attributes: ['userName'] }
            ],
            order: [['saleDate', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales Report');

        // Style header
        sheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Sale Number', key: 'saleNumber', width: 20 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Cashier', key: 'cashier', width: 15 },
            { header: 'Subtotal', key: 'subtotal', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Tax', key: 'tax', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Paid', key: 'paid', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        sales.forEach(sale => {
            sheet.addRow({
                date: sale.saleDate.toLocaleString(),
                saleNumber: sale.saleNumber,
                customer: sale.customer?.customerName || 'Walk-in',
                cashier: sale.cashier?.userName || 'N/A',
                subtotal: parseFloat(sale.subtotal),
                discount: parseFloat(sale.discountAmount),
                tax: parseFloat(sale.taxAmount),
                total: parseFloat(sale.totalAmount),
                paid: parseFloat(sale.paidAmount),
                status: sale.saleStatus
            });
        });

        // Add summary at bottom
        const lastRow = sheet.rowCount;
        sheet.addRow({});
        sheet.addRow({
            date: 'TOTAL',
            subtotal: { formula: `SUM(E2:E${lastRow})` },
            discount: { formula: `SUM(F2:F${lastRow})` },
            tax: { formula: `SUM(G2:G${lastRow})` },
            total: { formula: `SUM(H2:H${lastRow})` },
            paid: { formula: `SUM(I2:I${lastRow})` }
        });
        sheet.getRow(sheet.rowCount).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Sales_Report_${period}_${date || 'now'}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting sales excel:', error);
        res.status(500).json({ success: false, message: 'Error exporting sales data' });
    }
};

/**
 * Export Payments to Excel
 */
exports.exportPaymentsExcel = async (req, res) => {
    try {
        const { period = 'daily', date, branchId } = req.query;
        const { start, end } = getDateRange(period, date);

        const where = {
            paidDate: { [Op.between]: [start, end] },
            isCancelled: false
        };

        if (branchId) where.branchId = branchId;
        else if (req.branchId) where.branchId = req.branchId;

        const payments = await Payment.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['userName'] }
            ],
            order: [['paidDate', 'ASC']]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Payments Report');

        sheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Reference', key: 'reference', width: 20 },
            { header: 'Method', key: 'method', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Balance', key: 'balance', width: 15 },
            { header: 'Processed By', key: 'user', width: 15 },
            { header: 'Note', key: 'note', width: 30 }
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        payments.forEach(payment => {
            sheet.addRow({
                date: payment.paidDate.toLocaleString(),
                reference: payment.referenceNo,
                method: payment.paymentMethod,
                amount: parseFloat(payment.amountPaid),
                balance: parseFloat(payment.balanceAmount),
                user: payment.creator?.userName || 'N/A',
                note: payment.note
            });
        });

        const lastRow = sheet.rowCount;
        sheet.addRow({});
        sheet.addRow({
            reference: 'TOTAL',
            amount: { formula: `SUM(D2:D${lastRow})` }
        });
        sheet.getRow(sheet.rowCount).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Payments_Report_${period}_${date || 'now'}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting payments excel:', error);
        res.status(500).json({ success: false, message: 'Error exporting payments data' });
    }
};
