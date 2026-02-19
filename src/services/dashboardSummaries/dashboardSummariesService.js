const db = require('../../models');
const { Sale, SaleItem, Product, Customer, CustomerCredit, Suppliers, Payment } = db;
const { Op } = require('sequelize');

class DashboardSummariesService {
    /**
     * Get latest invoices/sales
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of invoices to fetch
     * @returns {object} Latest invoices with data and count
     */
    async getLatestInvoices(branchConfig, limit = 10) {
        const { branchId, branchAccess } = branchConfig;

        // Build where clause
        const where = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            }
        };

        // Apply branch filtering
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const { count, rows: invoices } = await Sale.findAndCountAll({
            where,
            attributes: [
                'id',
                'saleNumber',
                'totalAmount',
                'saleDate',
                'saleStatus',
                'customerId',
                'paymentStatus'
            ],
            include: [
                {
                    model: db.User,
                    as: 'cashier',
                    attributes: ['id', 'userName', 'firstName', 'lastName']
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'customerName', 'phone']
                }
            ],
            order: [['saleDate', 'DESC']],
            limit: parseInt(limit),
            raw: false
        });

        const data = invoices.map(sale => {
            const cashierName = sale.cashier
                ? `${sale.cashier.firstName || ''} ${sale.cashier.lastName || ''}`.trim() || sale.cashier.userName
                : 'Unknown';

            return {
                id: sale.id,
                invoiceNumber: sale.saleNumber,
                customerName: sale.customer?.customerName || 'Walk-in Customer',
                customerPhone: sale.customer?.phone || '-',
                totalAmount: parseFloat(parseFloat(sale.totalAmount || 0).toFixed(2)),
                saleDate: sale.saleDate,
                status: sale.saleStatus,
                paymentStatus: sale.paymentStatus,
                cashier: cashierName
            };
        });

        return {
            count,
            data
        };
    }

    /**
     * Get top selling products
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of products to fetch
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Top selling products with data and count
     */
    async getTopSellingProducts(branchConfig, limit = 10, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;

        // Build where clause for sales
        const saleWhere = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            }
        };

        // Apply date filtering if provided
        if (startDate && endDate) {
            saleWhere.saleDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Apply branch filtering
        if (branchId) {
            saleWhere.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            saleWhere.branchId = branchAccess.branches;
        }

        const topProducts = await SaleItem.findAll({
            attributes: [
                'productId',
                'productName',
                [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'totalQuantity'],
                [db.sequelize.fn('SUM', db.sequelize.col('SaleItem.total_amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('SaleItem.sale_id'))), 'orderCount']
            ],
            include: [
                {
                    model: Sale,
                    as: 'sale',
                    where: saleWhere,
                    attributes: []
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['productCode', 'unitOfMeasure']
                }
            ],
            group: ['product_id', 'product_name', 'product.id', 'product.product_code', 'product.unit_of_measure'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'DESC']],
            limit: parseInt(limit),
            raw: false,
            subQuery: false
        });

        const data = topProducts.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.product?.productCode || '-',
            totalQuantity: parseFloat(parseFloat(item.get('totalQuantity') || 0).toFixed(3)),
            totalAmount: parseFloat(parseFloat(item.get('totalAmount') || 0).toFixed(2)),
            orderCount: parseInt(item.get('orderCount') || 0),
            unitOfMeasure: item.product?.unitOfMeasure || 'pcs'
        }));

        return {
            count: data.length,
            data
        };
    }

    /**
     * Get lowest selling products
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of products to fetch
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Lowest selling products with data and count
     */
    async getLowestSellingProducts(branchConfig, limit = 10, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;

        // Build where clause for sales
        const saleWhere = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            }
        };

        // Apply date filtering if provided
        if (startDate && endDate) {
            saleWhere.saleDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Apply branch filtering
        if (branchId) {
            saleWhere.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            saleWhere.branchId = branchAccess.branches;
        }

        const lowestProducts = await SaleItem.findAll({
            attributes: [
                'productId',
                'productName',
                [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'totalQuantity'],
                [db.sequelize.fn('SUM', db.sequelize.col('SaleItem.total_amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('SaleItem.sale_id'))), 'orderCount']
            ],
            include: [
                {
                    model: Sale,
                    as: 'sale',
                    where: saleWhere,
                    attributes: []
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['productCode', 'unitOfMeasure']
                }
            ],
            group: ['product_id', 'product_name', 'product.id', 'product.product_code', 'product.unit_of_measure'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'ASC']],
            limit: parseInt(limit),
            raw: false,
            subQuery: false
        });

        const data = lowestProducts.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.product?.productCode || '-',
            totalQuantity: parseFloat(parseFloat(item.get('totalQuantity') || 0).toFixed(3)),
            totalAmount: parseFloat(parseFloat(item.get('totalAmount') || 0).toFixed(2)),
            orderCount: parseInt(item.get('orderCount') || 0),
            unitOfMeasure: item.product?.unitOfMeasure || 'pcs'
        }));

        return {
            count: data.length,
            data
        };
    }

    /**
     * Get both highest and lowest selling products
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of products to fetch for each category
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Both highest and lowest selling products
     */
    async getHighestAndLowestSellingProducts(branchConfig, limit = 10, startDate = null, endDate = null) {
        const [highest, lowest] = await Promise.all([
            this.getTopSellingProducts(branchConfig, limit, startDate, endDate),
            this.getLowestSellingProducts(branchConfig, limit, startDate, endDate)
        ]);

        return {
            highest: {
                count: highest.count,
                data: highest.data
            },
            lowest: {
                count: lowest.count,
                data: lowest.data
            }
        };
    }

    /**
     * Get customers with due payments
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of customers to fetch
     * @returns {object} Due customers with data and count
     */
    async getDueCustomers(branchConfig, limit = 20) {
        const { branchId, branchAccess } = branchConfig;

        // Build where clause
        const where = {
            status: {
                [Op.in]: ['pending', 'partial', 'overdue']
            }
        };

        // Apply branch filtering
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Get customers with outstanding credits
        const dueCredits = await CustomerCredit.findAll({
            where,
            attributes: [
                'customerId',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalDue'],
                [db.sequelize.fn('MIN', db.sequelize.col('due_date')), 'earliestDueDate'],
                [db.sequelize.fn('COUNT', db.sequelize.col('CustomerCredit.id')), 'creditCount']
            ],
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'customerCode', 'customerName', 'phone', 'customerType'],
                    where: {
                        isActive: true,
                        isDeleted: false
                    }
                }
            ],
            group: ['customer_id', 'customer.id', 'customer.customer_code', 'customer.customer_name', 'customer.phone', 'customer.customer_type'],
            having: db.sequelize.where(
                db.sequelize.fn('SUM', db.sequelize.col('amount')),
                Op.gt,
                0
            ),
            order: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'DESC']],
            limit: parseInt(limit),
            raw: false,
            subQuery: false
        });

        const data = dueCredits.map(item => {
            const dueDate = item.get('earliestDueDate');
            const isOverdue = dueDate && new Date(dueDate) < new Date();

            return {
                customerId: item.customerId,
                customerCode: item.customer?.customerCode || '-',
                customerName: item.customer?.customerName || 'Unknown',
                phone: item.customer?.phone || '-',
                customerType: item.customer?.customerType || 'retail',
                totalDue: parseFloat(parseFloat(item.get('totalDue') || 0).toFixed(2)),
                creditCount: parseInt(item.get('creditCount') || 0),
                earliestDueDate: dueDate,
                status: isOverdue ? 'overdue' : 'pending'
            };
        });

        return {
            count: data.length,
            data
        };
    }

    /**
     * Get suppliers with due payments
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of suppliers to fetch
     * @returns {object} Due suppliers with data and count
     */
    async getDueSuppliers(branchConfig, limit = 20) {
        const { branchId, branchAccess } = branchConfig;
        const { GRN, PurchaseOrder } = db;

        // Build where clause for GRNs
        const grnWhere = {
            status: {
                [Op.in]: ['received', 'verified', 'approved']
            }
        };

        // Apply branch filtering
        if (branchId) {
            grnWhere.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            grnWhere.branchId = branchAccess.branches;
        }

        // Get suppliers with recent GRNs (indicating potential due payments)
        const suppliersWithGRNs = await GRN.findAll({
            where: grnWhere,
            attributes: [
                'supplierId',
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.col('GRN.id')), 'grnCount'],
                [db.sequelize.fn('MAX', db.sequelize.col('grn_date')), 'lastGrnDate']
            ],
            include: [
                {
                    model: Suppliers,
                    as: 'supplier',
                    attributes: ['id', 'supplierCode', 'name', 'phone', 'email']
                }
            ],
            group: ['supplier_id', 'supplier.id', 'supplier.supplier_code', 'supplier.name', 'supplier.phone', 'supplier.email'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'DESC']],
            limit: parseInt(limit),
            raw: false,
            subQuery: false
        });

        const data = suppliersWithGRNs.map(item => ({
            supplierId: item.supplierId,
            supplierCode: item.supplier?.supplierCode || '-',
            supplierName: item.supplier?.name || 'Unknown',
            phone: item.supplier?.phone || '-',
            email: item.supplier?.email || '-',
            totalDue: parseFloat(parseFloat(item.get('totalAmount') || 0).toFixed(2)),
            grnCount: parseInt(item.get('grnCount') || 0),
            lastGrnDate: item.get('lastGrnDate')
        }));

        return {
            count: data.length,
            data
        };
    }

    /**
     * Get best customers by purchase value
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {number} limit - Number of customers to fetch
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Best customers with data and count
     */
    async getBestCustomers(branchConfig, limit = 10, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;

        // Build where clause for sales
        const where = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            },
            customerId: {
                [Op.ne]: null
            }
        };

        // Apply date filtering if provided
        if (startDate && endDate) {
            where.saleDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Apply branch filtering
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const bestCustomers = await Sale.findAll({
            where,
            attributes: [
                'customerId',
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalPurchases'],
                [db.sequelize.fn('COUNT', db.sequelize.col('Sale.id')), 'totalOrders'],
                [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'averageOrderValue'],
                [db.sequelize.fn('MAX', db.sequelize.col('sale_date')), 'lastPurchaseDate']
            ],
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'customerCode', 'customerName', 'phone', 'customerType', 'loyaltyPoints'],
                    where: {
                        isActive: true,
                        isDeleted: false
                    }
                }
            ],
            group: ['customer_id', 'customer.id', 'customer.customer_code', 'customer.customer_name', 'customer.phone', 'customer.customer_type', 'customer.loyalty_points'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'DESC']],
            limit: parseInt(limit),
            raw: false,
            subQuery: false
        });

        const data = bestCustomers.map(item => ({
            customerId: item.customerId,
            customerCode: item.customer?.customerCode || '-',
            customerName: item.customer?.customerName || 'Unknown',
            phone: item.customer?.phone || '-',
            customerType: item.customer?.customerType || 'retail',
            totalPurchases: parseFloat(parseFloat(item.get('totalPurchases') || 0).toFixed(2)),
            totalOrders: parseInt(item.get('totalOrders') || 0),
            averageOrderValue: parseFloat(parseFloat(item.get('averageOrderValue') || 0).toFixed(2)),
            lastPurchaseDate: item.get('lastPurchaseDate'),
            loyaltyPoints: item.customer?.loyaltyPoints || 0
        }));

        return {
            count: data.length,
            data
        };
    }

    /**
     * Get total sales summary
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Total sales data
     */
    async getTotalSales(branchConfig, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;

        const where = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            }
        };

        if (startDate && endDate) {
            where.saleDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const result = await Sale.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalSales'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalTransactions'],
                [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'averageSale']
            ],
            raw: true
        });

        return {
            totalSales: parseFloat(parseFloat(result?.totalSales || 0).toFixed(2)),
            totalTransactions: parseInt(result?.totalTransactions || 0),
            averageSale: parseFloat(parseFloat(result?.averageSale || 0).toFixed(2))
        };
    }

    /**
     * Get stock cost summary
     * @param {object} branchConfig - Branch configuration from middleware
     * @returns {object} Stock cost data
     */
    async getStockCost(branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const { Inventory } = db;

        const where = {};

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const result = await Inventory.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.literal('quantity * unit_cost')), 'totalStockCost'],
                [db.sequelize.fn('SUM', db.sequelize.col('quantity')), 'totalQuantity'],
                [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('product_id'))), 'totalProducts']
            ],
            raw: true
        });

        return {
            totalStockCost: parseFloat(parseFloat(result?.totalStockCost || 0).toFixed(2)),
            totalQuantity: parseFloat(parseFloat(result?.totalQuantity || 0).toFixed(3)),
            totalProducts: parseInt(result?.totalProducts || 0)
        };
    }

    /**
     * Get today's sales summary
     * @param {object} branchConfig - Branch configuration from middleware
     * @returns {object} Today's sales data
     */
    async getTodaySales(branchConfig) {
        const { branchId, branchAccess } = branchConfig;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const where = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            },
            saleDate: {
                [Op.between]: [today, tomorrow]
            }
        };

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const result = await Sale.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'todaySales'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'todayTransactions'],
                [db.sequelize.fn('SUM', db.sequelize.col('profit')), 'todayProfit']
            ],
            raw: true
        });

        return {
            todaySales: parseFloat(parseFloat(result?.todaySales || 0).toFixed(2)),
            todayTransactions: parseInt(result?.todayTransactions || 0),
            todayProfit: parseFloat(parseFloat(result?.todayProfit || 0).toFixed(2))
        };
    }

    /**
     * Get total incomes summary
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Total incomes data
     */
    async getTotalIncomes(branchConfig, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;

        const where = {
            saleStatus: {
                [Op.ne]: 'cancelled'
            }
        };

        if (startDate && endDate) {
            where.saleDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const result = await Sale.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalIncome'],
                [db.sequelize.fn('SUM', db.sequelize.col('profit')), 'totalProfit'],
                [db.sequelize.fn('SUM', db.sequelize.literal('total_amount - profit')), 'totalCost']
            ],
            raw: true
        });

        return {
            totalIncome: parseFloat(parseFloat(result?.totalIncome || 0).toFixed(2)),
            totalProfit: parseFloat(parseFloat(result?.totalProfit || 0).toFixed(2)),
            totalCost: parseFloat(parseFloat(result?.totalCost || 0).toFixed(2)),
            profitMargin: result?.totalIncome > 0 
                ? parseFloat(((result.totalProfit / result.totalIncome) * 100).toFixed(2))
                : 0
        };
    }

    /**
     * Get customer payments summary
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Customer payments data
     */
    async getCustomerPayments(branchConfig, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;
        const { SalePayment } = db;

        const where = {};

        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [startDate, endDate]
            };
        }

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const payments = await SalePayment.findAll({
            where,
            attributes: [
                'paymentMethod',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'paymentCount']
            ],
            group: ['payment_method'],
            raw: true
        });

        const totalResult = await SalePayment.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalPayments'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalCount']
            ],
            raw: true
        });

        return {
            totalPayments: parseFloat(parseFloat(totalResult?.totalPayments || 0).toFixed(2)),
            totalCount: parseInt(totalResult?.totalCount || 0),
            byPaymentMethod: payments.map(p => ({
                paymentMethod: p.paymentMethod,
                totalAmount: parseFloat(parseFloat(p.totalAmount || 0).toFixed(2)),
                paymentCount: parseInt(p.paymentCount || 0)
            }))
        };
    }

    /**
     * Get supplier payments summary
     * @param {object} branchConfig - Branch configuration from middleware
     * @param {Date} startDate - Optional start date for filtering
     * @param {Date} endDate - Optional end date for filtering
     * @returns {object} Supplier payments data
     */
    async getSupplierPayments(branchConfig, startDate = null, endDate = null) {
        const { branchId, branchAccess } = branchConfig;
        const { GRN } = db;

        const where = {};

        if (startDate && endDate) {
            where.grnDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const result = await GRN.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalPayments'],
                [db.sequelize.fn('COUNT', db.sequelize.col('GRN.id')), 'totalGRNs'],
                [db.sequelize.fn('AVG', db.sequelize.col('total_amount')), 'averagePayment']
            ],
            raw: true
        });

        const topSuppliers = await GRN.findAll({
            where,
            attributes: [
                'supplierId',
                [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
                [db.sequelize.fn('COUNT', db.sequelize.col('GRN.id')), 'grnCount']
            ],
            include: [
                {
                    model: Suppliers,
                    as: 'supplier',
                    attributes: ['id', 'supplierCode', 'name']
                }
            ],
            group: ['supplier_id', 'supplier.id', 'supplier.supplier_code', 'supplier.name'],
            order: [[db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'DESC']],
            limit: 5,
            raw: false,
            subQuery: false
        });

        return {
            totalPayments: parseFloat(parseFloat(result?.totalPayments || 0).toFixed(2)),
            totalGRNs: parseInt(result?.totalGRNs || 0),
            averagePayment: parseFloat(parseFloat(result?.averagePayment || 0).toFixed(2)),
            topSuppliers: topSuppliers.map(item => ({
                supplierId: item.supplierId,
                supplierCode: item.supplier?.supplierCode || '-',
                supplierName: item.supplier?.name || 'Unknown',
                totalAmount: parseFloat(parseFloat(item.get('totalAmount') || 0).toFixed(2)),
                grnCount: parseInt(item.get('grnCount') || 0)
            }))
        };
    }
}

module.exports = new DashboardSummariesService();
