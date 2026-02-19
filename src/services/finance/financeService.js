const db = require('../../models');
const { Sale, SalePayment, Expense, SupplierPayment, CustomerRefund, CustomerCredit, CounterSession, Counter, User, Customer, SaleItem } = db;
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

class FinanceService {
    /**
     * Get finance statistics for a specific period
     * @param {Date} startDate - Start of the period
     * @param {Date} endDate - End of the period
     * @param {object} branchConfig - Branch access configuration
     * @param {object} filters - Additional filters (counterId, counterSessionId)
     * @returns {object} Aggregated finance statistics
     */
    async getFinanceStatistics(startDate, endDate, branchConfig, filters = {}) {
        const { branchId, branchAccess } = branchConfig;
        const { counterId, counterSessionId } = filters;

        let session = null;
        let effectiveSessionId = counterSessionId;

        // If counterId is provided but not counterSessionId, find the current/latest session
        if (counterId && !effectiveSessionId) {
            session = await CounterSession.findOne({
                where: {
                    counterId,
                    branchId: branchId || { [Op.not]: null },
                    [Op.or]: [
                        { status: 'OPEN' },
                        { openingTime: { [Op.between]: [startDate, endDate] } }
                    ]
                },
                order: [['openingTime', 'DESC']]
            });
            if (session) effectiveSessionId = session.id;
        } else if (effectiveSessionId) {
            session = await CounterSession.findByPk(effectiveSessionId);
        }

        // Base where clause for all queries
        const getBaseWhere = (dateField, modelSessionIdField = 'counterSessionId') => {
            const where = {};

            if (effectiveSessionId) {
                where[modelSessionIdField] = effectiveSessionId;
            } else {
                where[dateField] = {
                    [Op.between]: [startDate, endDate]
                };
            }

            if (branchId) {
                where.branchId = branchId;
            } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
                where.branchId = branchAccess.branches;
            }

            return where;
        };

        // 1. Fetch Sale Payments (Inflow)
        const salePaymentWhere = {};
        if (effectiveSessionId) {
            // Filter via include
        } else {
            salePaymentWhere.paymentDate = { [Op.between]: [startDate, endDate] };
        }

        if (branchId) {
            salePaymentWhere.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            salePaymentWhere.branchId = branchAccess.branches;
        }

        const salePayments = await SalePayment.findAll({
            where: salePaymentWhere,
            include: [{
                model: Sale,
                as: 'sale',
                attributes: [],
                where: effectiveSessionId ? { counterSessionId: effectiveSessionId } : {},
                required: !!effectiveSessionId
            }],
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        // 2. Fetch Customer Credit Payments (Inflow) - These are payments for old bills
        const customerCreditPayments = await CustomerCredit.findAll({
            where: {
                ...getBaseWhere('createdAt', 'counterSessionId'),
                transactionType: 'payment_received'
            },
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.fn('ABS', db.sequelize.col('amount'))), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        // 3. Fetch Expenses (Outflow)
        const expenseWhere = getBaseWhere('expenseDate', 'counterSessionId');
        expenseWhere.isDeleted = false;
        const expenses = await Expense.findAll({
            where: expenseWhere,
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        // 4. Fetch Supplier Payments (Outflow)
        const supplierPayments = await SupplierPayment.findAll({
            where: {
                ...getBaseWhere('paymentDate', 'counterSessionId'),
                status: 'completed'
            },
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['paymentMethod'],
            raw: true
        });

        // 5. Fetch Customer Refunds (Outflow)
        const refunds = await CustomerRefund.findAll({
            where: getBaseWhere('refundDate', 'counterSessionId'),
            attributes: [
                'refundMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('paid_amount')), 'total']
            ],
            group: ['refundMethod'],
            raw: true
        });

        // 5.5 Fetch Tax Totals
        const taxTotals = await Sale.findAll({
            where: effectiveSessionId ? { counterSessionId: effectiveSessionId } : {
                saleDate: { [Op.between]: [startDate, endDate] },
                branchId: branchId || { [Op.not]: null }
            },
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('tax_amount')), 'totalSalesTax'],
                [db.sequelize.fn('SUM', db.sequelize.col('return_tax_amount')), 'totalReturnTax']
            ],
            raw: true
        });

        const refundTaxTotals = await CustomerRefund.findAll({
            where: getBaseWhere('refundDate', 'counterSessionId'),
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('tax_amount')), 'totalRefundTax']
            ],
            raw: true
        });

        const totalSalesTax = parseFloat(taxTotals[0]?.totalSalesTax || 0);
        const totalReturnTax = parseFloat(taxTotals[0]?.totalReturnTax || 0);
        const totalRefundTax = parseFloat(refundTaxTotals[0]?.totalRefundTax || 0);
        const netTaxCollected = totalSalesTax - totalReturnTax - totalRefundTax;

        // 6. Fetch Counter Sessions (Opening Balances)
        let totalOpening = 0;
        if (effectiveSessionId) {
            totalOpening = parseFloat(session?.openingBalance || 0);
        } else {
            const sessions = await CounterSession.findAll({
                where: getBaseWhere('openingTime', 'id'),
                attributes: [
                    [db.sequelize.fn('SUM', db.sequelize.col('opening_balance')), 'totalOpening']
                ],
                raw: true
            });
            totalOpening = parseFloat(sessions[0]?.totalOpening || 0);
        }

        // 7. Recent Transactions (Last of the day)
        const recentSales = await Sale.findAll({
            where: effectiveSessionId ? { counterSessionId: effectiveSessionId } : {
                saleDate: { [Op.between]: [startDate, endDate] },
                branchId: branchId || { [Op.not]: null }
            },
            include: [
                { model: Customer, as: 'customer', attributes: ['customerName'] },
                { model: SalePayment, as: 'payments' }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        const recentExpenses = await Expense.findAll({
            where: expenseWhere,
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        // Process results into a unified format
        const stats = {
            summary: {
                openingBalance: totalOpening,
                totalIncome: 0,
                totalExpenses: 0,
                totalSupplierPayments: 0,
                totalRefunds: 0,
                totalTaxCollected: netTaxCollected,
                netBalance: 0,
                cashInHand: 0
            },
            taxSummary: {
                totalSalesTax,
                totalReturnTax,
                totalRefundTax,
                netTaxCollected
            },
            income: {
                total: 0,
                byMethod: {}
            },
            expenses: {
                total: 0,
                byMethod: {}
            },
            supplierPayments: {
                total: 0,
                byMethod: {}
            },
            refunds: {
                total: 0,
                byMethod: {}
            },
            recentTransactions: {
                sales: recentSales,
                expenses: recentExpenses
            },
            session: session ? {
                id: session.id,
                counterId: session.counterId,
                status: session.status,
                openingTime: session.openingTime,
                closingTime: session.closingTime,
                denominations: session.denominations,
                actualCashReceived: session.actualCashReceived
            } : null
        };

        const processRows = (rows, target, totalField = 'total', methodField = 'paymentMethod') => {
            rows.forEach(row => {
                const method = (row[methodField] || 'other').toLowerCase();
                const amount = parseFloat(row[totalField] || 0);
                target.total += amount;
                target.byMethod[method] = (target.byMethod[method] || 0) + amount;
            });
        };

        processRows(salePayments, stats.income);
        processRows(customerCreditPayments, stats.income);
        processRows(expenses, stats.expenses);
        processRows(supplierPayments, stats.supplierPayments);
        processRows(refunds, stats.refunds, 'total', 'refundMethod');

        stats.summary.totalIncome = stats.income.total;
        stats.summary.totalExpenses = stats.expenses.total;
        stats.summary.totalSupplierPayments = stats.supplierPayments.total;
        stats.summary.totalRefunds = stats.refunds.total;

        stats.summary.netBalance = stats.summary.totalIncome - stats.summary.totalExpenses - stats.summary.totalSupplierPayments - stats.summary.totalRefunds;

        const cashIncome = (stats.income.byMethod['cash'] || 0);
        const cashExpense = (stats.expenses.byMethod['cash'] || 0);
        const cashSupplier = (stats.supplierPayments.byMethod['cash'] || 0);
        const cashRefund = (stats.refunds.byMethod['cash'] || 0);

        stats.summary.cashInHand = stats.summary.openingBalance + cashIncome - cashExpense - cashSupplier - cashRefund;

        return stats;
    }

    /**
     * Generate Excel Report for Finance
     */
    async generateFinanceExcel(startDate, endDate, branchConfig, filters = {}) {
        const stats = await this.getFinanceStatistics(startDate, endDate, branchConfig, filters);
        const { branchId } = branchConfig;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Finance Report');

        // Styles
        const titleStyle = { font: { bold: true, size: 14 } };
        const headerStyle = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }, border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } };
        const borderStyle = { border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } };

        // 1. Report Header
        worksheet.mergeCells('A1:J1');
        worksheet.getCell('A1').value = 'Finance Statistics Report';
        worksheet.getCell('A1').style = titleStyle;
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        worksheet.addRow(['Date Range:', `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`]);
        if (stats.session) {
            worksheet.addRow(['Counter:', `CS-${stats.session.id} (Status: ${stats.session.status})`]);
        }
        worksheet.addRow([]);

        // 2. Sales Table (Current Bills)
        worksheet.addRow(['Sales (Current Day)']).font = { bold: true };
        const salesHeader = ['No', 'Bill No', 'Customer Name', 'Bill Amount', 'Tax', 'Cash', 'Credit', 'Chq', 'D/c', 'Rtn', 'Variance'];
        const salesHeaderRow = worksheet.addRow(salesHeader);
        salesHeaderRow.eachCell(cell => cell.style = headerStyle);

        // Fetch all sales for the period/session to fill table
        const commonWhere = stats.session ? { counterSessionId: stats.session.id } : {
            branchId: branchId || { [Op.not]: null }
        };

        const saleWhere = { ...commonWhere };
        if (!stats.session) {
            saleWhere.saleDate = { [Op.between]: [startDate, endDate] };
        }

        const allSales = await Sale.findAll({
            where: saleWhere,
            include: [
                { model: Customer, as: 'customer', attributes: ['customerName'] },
                { model: SalePayment, as: 'payments' },
                { model: SaleItem, as: 'items' }
            ],
            order: [['createdAt', 'ASC']]
        });

        let totalSalesAmount = 0;
        let totalTaxAmount = 0;
        let totalCashSales = 0;
        let totalCreditSales = 0;
        let totalChequeSales = 0;
        let totalDiscount = 0;
        let totalReturn = 0;

        allSales.forEach((sale, index) => {
            const cashPayment = sale.payments.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + parseFloat(p.amount), 0);
            const chequePayment = sale.payments.filter(p => p.paymentMethod === 'cheque').reduce((s, p) => s + parseFloat(p.amount), 0);
            const discount = parseFloat(sale.discountAmount || 0);
            const tax = parseFloat(sale.taxAmount || 0);
            const returns = parseFloat(sale.returnTotalAmount || 0);

            worksheet.addRow([
                index + 1,
                sale.saleNumber,
                sale.customer?.customerName || 'Walk-in',
                parseFloat(sale.totalAmount),
                tax,
                cashPayment,
                parseFloat(sale.creditAmount),
                chequePayment,
                discount,
                returns,
                0 // Variance placeholder
            ]).eachCell(cell => cell.style = borderStyle);

            totalSalesAmount += parseFloat(sale.totalAmount);
            totalTaxAmount += tax;
            totalCashSales += cashPayment;
            totalCreditSales += parseFloat(sale.creditAmount);
            totalChequeSales += chequePayment;
            totalDiscount += discount;
            totalReturn += returns;
        });

        const salesTotalRow = worksheet.addRow(['Total', '', '', totalSalesAmount, totalTaxAmount, totalCashSales, totalCreditSales, totalChequeSales, totalDiscount, totalReturn, 0]);
        salesTotalRow.font = { bold: true };
        salesTotalRow.eachCell(cell => cell.style = borderStyle);
        worksheet.addRow([]);

        // 3. Old Bill Payments
        worksheet.addRow(['Old Bill Payments']).font = { bold: true };
        const oldBillHeader = ['No', 'In No', 'Customer Name', 'Amount'];
        const oldBillHeaderRow = worksheet.addRow(oldBillHeader);
        oldBillHeaderRow.eachCell(cell => cell.style = headerStyle);

        const creditWhere = { ...commonWhere, transactionType: 'payment_received' };
        if (!stats.session) {
            creditWhere.createdAt = { [Op.between]: [startDate, endDate] };
        }

        const oldPayments = await CustomerCredit.findAll({
            where: creditWhere,
            include: [{ model: Customer, as: 'customer', attributes: ['customerName'] }]
        });

        let totalOldPayments = 0;
        oldPayments.forEach((p, index) => {
            worksheet.addRow([index + 1, p.referenceId || '', p.customer?.customerName || '', Math.abs(parseFloat(p.amount))]).eachCell(cell => cell.style = borderStyle);
            totalOldPayments += Math.abs(parseFloat(p.amount));
        });
        worksheet.addRow(['Total', '', '', totalOldPayments]).font = { bold: true };
        worksheet.addRow([]);

        // 4. Expenses
        worksheet.addRow(['Expenses']).font = { bold: true };
        const expHeader = ['No', 'Description', 'Amount'];
        const expHeaderRow = worksheet.addRow(expHeader);
        expHeaderRow.eachCell(cell => cell.style = headerStyle);

        const expenseWhere = { ...commonWhere, isDeleted: false };
        if (!stats.session) {
            expenseWhere.expenseDate = { [Op.between]: [startDate, endDate] };
        }

        const periodExpenses = await Expense.findAll({
            where: expenseWhere
        });

        let totalExp = 0;
        periodExpenses.forEach((e, index) => {
            worksheet.addRow([index + 1, e.title, parseFloat(e.paidAmount)]).eachCell(cell => cell.style = borderStyle);
            totalExp += parseFloat(e.paidAmount);
        });
        worksheet.addRow(['Total', '', totalExp]).font = { bold: true };
        worksheet.addRow([]);

        // 5. Cash Breakdown & Summary
        const lastRow = worksheet.lastRow.number + 2;
        worksheet.getCell(`A${lastRow}`).value = 'Cash Breakdown';
        worksheet.getCell(`A${lastRow}`).font = { bold: true };

        const denominations = stats.session?.denominations || { "5000": 0, "2000": 0, "1000": 0, "500": 0, "100": 0, "50": 0, "20": 0, "Coins": 0 };
        const denoms = [5000, 2000, 1000, 500, 100, 50, 20];
        let denomTotal = 0;

        let currRow = lastRow + 1;
        denoms.forEach(d => {
            const qty = denominations[d] || 0;
            const sub = qty * d;
            worksheet.addRow([d, '*', qty, sub]);
            denomTotal += sub;
            currRow++;
        });
        worksheet.addRow(['Coins', '', '', denominations['Coins'] || 0]);
        denomTotal += parseFloat(denominations['Coins'] || 0);
        worksheet.addRow(['Total', '', '', denomTotal]).font = { bold: true };

        // Summary Side Table
        const summaryStartCol = 7;
        worksheet.getCell(lastRow, summaryStartCol).value = 'Financial Summary';
        worksheet.getCell(lastRow, summaryStartCol).font = { bold: true };

        worksheet.getCell(lastRow + 1, summaryStartCol).value = 'Cash Sales';
        worksheet.getCell(lastRow + 1, summaryStartCol + 1).value = totalCashSales;

        worksheet.getCell(lastRow + 2, summaryStartCol).value = 'Old Bill Amount';
        worksheet.getCell(lastRow + 2, summaryStartCol + 1).value = totalOldPayments;

        worksheet.getCell(lastRow + 3, summaryStartCol).value = 'Expense Amount';
        worksheet.getCell(lastRow + 3, summaryStartCol + 1).value = totalExp;

        worksheet.getCell(lastRow + 5, summaryStartCol).value = 'Total Cash Amount';
        worksheet.getCell(lastRow + 5, summaryStartCol + 1).value = denomTotal;

        const expectedCash = totalCashSales + totalOldPayments - totalExp;
        worksheet.getCell(lastRow + 6, summaryStartCol).value = 'Short/Excess';
        worksheet.getCell(lastRow + 6, summaryStartCol + 1).value = denomTotal - expectedCash;

        return workbook;
    }
}

module.exports = new FinanceService();
