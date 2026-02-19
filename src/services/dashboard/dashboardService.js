const db = require('../../models');
const { Sale, SaleItem, SalePayment, Product, Category } = db;
const { Op } = require('sequelize');

class DashboardService {
    /**
     * Get dashboard statistics for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {string} rangeType - Type of range (today, yesterday, past_month, past_year, custom, single_day)
     * @param {object} branchConfig - Branch configuration from middleware
     * @returns {object} Dashboard statistics with analytics
     */
    async getDashboardStatistics(startDate, endDate, rangeType, branchConfig) {
        // Build where clause
        const where = {
            saleDate: {
                [Op.between]: [startDate, endDate]
            },
            saleStatus: {
                [Op.ne]: 'cancelled' // Exclude cancelled sales
            }
        };

        // Apply branch filtering if applicable
        const { branchId, branchAccess } = branchConfig;
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Get all sales for the date range
        const sales = await Sale.findAll({
            where,
            attributes: [
                'id',
                'totalAmount',
                'profit'
            ],
            include: [{
                model: SaleItem,
                as: 'items',
                attributes: ['quantity']
            }]
        });

        // Calculate summary statistics
        const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0);
        const totalTransactions = sales.length;
        const grossProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit || 0), 0);

        // Calculate total items sold
        let itemsSold = 0;
        sales.forEach(sale => {
            if (sale.items && sale.items.length > 0) {
                itemsSold += sale.items.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
            }
        });

        // Get analytics data
        const analytics = await this.getAnalytics(where, branchConfig);

        return {
            summary: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                range: rangeType,
                totalSales: parseFloat(totalSales.toFixed(2)),
                totalTransactions,
                itemsSold: parseFloat(itemsSold.toFixed(3)),
                grossProfit: parseFloat(grossProfit.toFixed(2))
            },
            analytics
        };
    }

    /**
     * Get analytics data for charts
     * @param {object} where - Where clause for filtering sales
     * @param {object} branchConfig - Branch configuration
     * @returns {object} Analytics data
     */
    async getAnalytics(where, branchConfig) {
        const [salesTrend, salesByCategory, paymentMethods, topProducts, lowStockAlerts, recentTransactions] = await Promise.all([
            this.getSalesTrend(where),
            this.getSalesByCategory(where),
            this.getPaymentMethods(where),
            this.getTopProducts(where),
            this.getLowStockAlerts(branchConfig),
            this.getRecentTransactions(where)
        ]);

        return {
            salesTrend,
            salesByCategory,
            paymentMethods,
            topProducts,
            lowStockAlerts,
            recentTransactions
        };
    }

    /**
     * Get hourly sales trend for line chart
     * @param {object} where - Where clause for filtering sales
     * @returns {array} Hourly sales data
     */
    async getSalesTrend(where) {
        // Build the WHERE conditions for raw query
        const conditions = [];
        const replacements = {};

        // Date range condition
        if (where.saleDate && where.saleDate[Op.between]) {
            conditions.push('sale_date BETWEEN :startDate AND :endDate');
            replacements.startDate = where.saleDate[Op.between][0];
            replacements.endDate = where.saleDate[Op.between][1];
        }

        // Sale status condition
        if (where.saleStatus && where.saleStatus[Op.ne]) {
            conditions.push('sale_status != :excludeStatus');
            replacements.excludeStatus = where.saleStatus[Op.ne];
        }

        // Branch condition
        if (where.branchId) {
            if (Array.isArray(where.branchId)) {
                conditions.push('branch_id IN (:branchIds)');
                replacements.branchIds = where.branchId;
            } else {
                conditions.push('branch_id = :branchId');
                replacements.branchId = where.branchId;
            }
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // Execute raw SQL query for accurate hourly aggregation
        const query = `
            SELECT 
                HOUR(sale_date) as hour,
                COALESCE(SUM(total_amount), 0) as amount
            FROM sales
            ${whereClause}
            GROUP BY HOUR(sale_date)
            ORDER BY HOUR(sale_date) ASC
        `;

        const [results] = await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        // Create array for all 24 hours with 0 as default
        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            amount: 0
        }));

        // Fill in actual sales data
        if (Array.isArray(results)) {
            results.forEach(row => {
                const hour = parseInt(row.hour);
                if (hour >= 0 && hour < 24) {
                    hourlyData[hour].amount = parseFloat(parseFloat(row.amount || 0).toFixed(2));
                }
            });
        } else if (results && typeof results.hour !== 'undefined') {
            // Single result case
            const hour = parseInt(results.hour);
            if (hour >= 0 && hour < 24) {
                hourlyData[hour].amount = parseFloat(parseFloat(results.amount || 0).toFixed(2));
            }
        }

        return hourlyData;
    }

    /**
     * Get sales by category for pie chart
     * @param {object} where - Where clause for filtering sales
     * @returns {array} Category-wise sales data
     */
    async getSalesByCategory(where) {
        const categoryData = await SaleItem.findAll({
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('SaleItem.total_amount')), 'amount'],
                [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('SaleItem.sale_id'))), 'count']
            ],
            include: [
                {
                    model: Sale,
                    as: 'sale',
                    where,
                    attributes: []
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: [],
                    include: [{
                        model: Category,
                        as: 'category',
                        attributes: ['name']
                    }]
                }
            ],
            group: ['product.category.id', 'product.category.name'],
            raw: true
        });

        // Calculate total for percentage
        const total = categoryData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        // Format data with percentages
        const formattedData = categoryData.map(item => ({
            category: item['product.category.name'] || 'Uncategorized',
            amount: parseFloat(parseFloat(item.amount || 0).toFixed(2)),
            percentage: total > 0 ? parseFloat(((parseFloat(item.amount || 0) / total) * 100).toFixed(1)) : 0,
            count: parseInt(item.count || 0)
        }));

        // Sort by amount descending
        return formattedData.sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get payment methods breakdown for pie chart
     * @param {object} where - Where clause for filtering sales
     * @returns {array} Payment methods data
     */
    async getPaymentMethods(where) {
        const paymentData = await SalePayment.findAll({
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.col('SalePayment.id')), 'count']
            ],
            include: [{
                model: Sale,
                as: 'sale',
                where,
                attributes: []
            }],
            group: ['payment_method'],
            raw: true
        });

        // Calculate total for percentage
        const total = paymentData.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);

        // Format data with percentages
        const formattedData = paymentData.map(item => ({
            method: item.paymentMethod,
            amount: parseFloat(parseFloat(item.totalAmount || 0).toFixed(2)),
            percentage: total > 0 ? parseFloat(((parseFloat(item.totalAmount || 0) / total) * 100).toFixed(1)) : 0,
            count: parseInt(item.count || 0)
        }));

        // Sort by amount descending
        return formattedData.sort((a, b) => b.amount - a.amount);
    }

    /**
     * Get top 5 selling products for bar chart
     * @param {object} where - Where clause for filtering sales
     * @returns {array} Top products data
     */
    async getTopProducts(where) {
        const topProducts = await SaleItem.findAll({
            attributes: [
                'productId',
                'productName',
                [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'quantity'],
                [db.sequelize.fn('SUM', db.sequelize.col('SaleItem.total_amount')), 'amount']
            ],
            include: [{
                model: Sale,
                as: 'sale',
                where,
                attributes: []
            }],
            group: ['product_id', 'product_name'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'DESC']],
            limit: 5,
            raw: true
        });

        return topProducts.map(product => ({
            productId: product.productId,
            productName: product.productName,
            quantity: parseFloat(parseFloat(product.quantity || 0).toFixed(3)),
            amount: parseFloat(parseFloat(product.amount || 0).toFixed(2))
        }));
    }

    /**
     * Get low stock alerts for products below threshold
     * @param {object} branchConfig - Branch configuration
     * @returns {array} Low stock products
     */
    async getLowStockAlerts(branchConfig) {
        const { branchId, branchAccess } = branchConfig;

        // Build where clause for branch filtering
        const where = {
            isActive: true
        };

        // Apply branch filtering
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Query to get products with low stock
        const query = `
            SELECT 
                p.id as productId,
                p.name as productName,
                p.product_code as productCode,
                COALESCE(SUM(i.quantity), 0) as currentStock,
                p.min_stock_level as minStockLevel,
                p.unit_of_measure as unitOfMeasure
            FROM products p
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = 1
            ${branchId ? 'AND p.branch_id = :branchId' : ''}
            ${branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0 ? 'AND p.branch_id IN (:branchIds)' : ''}
            GROUP BY p.id, p.name, p.product_code, p.min_stock_level, p.unit_of_measure
            HAVING currentStock < COALESCE(p.min_stock_level, 5)
            ORDER BY currentStock ASC
            LIMIT 20
        `;

        const replacements = {};
        if (branchId) {
            replacements.branchId = branchId;
        }
        if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            replacements.branchIds = branchAccess.branches;
        }

        const [results] = await db.sequelize.query(query, {
            replacements,
            type: db.sequelize.QueryTypes.SELECT
        });

        if (!Array.isArray(results)) {
            return [];
        }

        return results.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            currentStock: parseFloat(parseFloat(item.currentStock || 0).toFixed(3)),
            minStockLevel: item.minStockLevel || 5,
            unitOfMeasure: item.unitOfMeasure || 'pcs',
            status: parseFloat(item.currentStock) === 0 ? 'out_of_stock' : 'low_stock'
        }));
    }

    /**
     * Get recent transactions (last 10 sales)
     * @param {object} where - Where clause for filtering sales
     * @returns {array} Recent transactions
     */
    async getRecentTransactions(where) {
        const { User } = db;

        const recentSales = await Sale.findAll({
            where,
            attributes: [
                'id',
                'saleNumber',
                'totalAmount',
                'saleDate'
            ],
            include: [{
                model: User,
                as: 'cashier',
                attributes: ['id', 'userName', 'firstName', 'lastName']
            }],
            order: [['saleDate', 'DESC']],
            limit: 10,
            raw: false
        });

        return recentSales.map(sale => {
            const cashierName = sale.cashier
                ? `${sale.cashier.firstName || ''} ${sale.cashier.lastName || ''}`.trim() || sale.cashier.userName
                : 'Unknown';

            return {
                billNo: sale.saleNumber,
                amount: parseFloat(parseFloat(sale.totalAmount || 0).toFixed(2)),
                time: sale.saleDate,
                cashier: cashierName,
                saleId: sale.id
            };
        });
    }
}

module.exports = new DashboardService();
