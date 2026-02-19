const dashboardSummariesService = require('../../services/dashboardSummaries/dashboardSummariesService');
const { getBranchConfig } = require('../../utils/branchHelper');

/**
 * Parse date from query string
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null}
 */
function parseDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Get latest invoices
 * @route GET /api/dashboard-summaries/latest-invoices
 * @access Private
 */
exports.getLatestInvoices = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 10;

        const result = await dashboardSummariesService.getLatestInvoices(branchConfig, limit);

        res.json({
            success: true,
            count: result.count,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching latest invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching latest invoices',
            error: error.message
        });
    }
};

/**
 * Get top selling products
 * @route GET /api/dashboard-summaries/top-selling-products
 * @access Private
 */
exports.getTopSellingProducts = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 10;
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getTopSellingProducts(
            branchConfig,
            limit,
            startDate,
            endDate
        );

        res.json({
            success: true,
            count: result.count,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching top selling products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching top selling products',
            error: error.message
        });
    }
};

/**
 * Get lowest selling products
 * @route GET /api/dashboard-summaries/lowest-selling-products
 * @access Private
 */
exports.getLowestSellingProducts = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 10;
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getLowestSellingProducts(
            branchConfig,
            limit,
            startDate,
            endDate
        );

        res.json({
            success: true,
            count: result.count,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching lowest selling products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching lowest selling products',
            error: error.message
        });
    }
};

/**
 * Get both highest and lowest selling products
 * @route GET /api/dashboard-summaries/highest-lowest-products
 * @access Private
 */
exports.getHighestAndLowestSellingProducts = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 10;
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getHighestAndLowestSellingProducts(
            branchConfig,
            limit,
            startDate,
            endDate
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error fetching highest and lowest selling products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching highest and lowest selling products',
            error: error.message
        });
    }
};

/**
 * Get customers with due payments
 * @route GET /api/dashboard-summaries/due-customers
 * @access Private
 */
exports.getDueCustomers = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 20;

        const result = await dashboardSummariesService.getDueCustomers(branchConfig, limit);

        res.json({
            success: true,
            count: result.count,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching due customers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching due customers',
            error: error.message
        });
    }
};

/**
 * Get suppliers with due payments
 * @route GET /api/dashboard-summaries/due-suppliers
 * @access Private
 */
exports.getDueSuppliers = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 20;

        const result = await dashboardSummariesService.getDueSuppliers(branchConfig, limit);

        res.json({
            success: true,
            count: result.count,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching due suppliers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching due suppliers',
            error: error.message
        });
    }
};

/**
 * Get best customers by purchase value
 * @route GET /api/dashboard-summaries/best-customers
 * @access Private
 */
exports.getBestCustomers = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const limit = parseInt(req.query.limit) || 10;
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getBestCustomers(
            branchConfig,
            limit,
            startDate,
            endDate
        );

        res.json({
            success: true,
            count: result.count,
            data: result.data
        });
    } catch (error) {
        console.error('Error fetching best customers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching best customers',
            error: error.message
        });
    }
};

/**
 * Get total sales summary
 * @route GET /api/dashboard-summaries/total-sales
 * @access Private
 */
exports.getTotalSales = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getTotalSales(branchConfig, startDate, endDate);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching total sales:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching total sales',
            error: error.message
        });
    }
};

/**
 * Get stock cost summary
 * @route GET /api/dashboard-summaries/stock-cost
 * @access Private
 */
exports.getStockCost = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);

        const result = await dashboardSummariesService.getStockCost(branchConfig);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching stock cost:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stock cost',
            error: error.message
        });
    }
};

/**
 * Get today's sales summary
 * @route GET /api/dashboard-summaries/today-sales
 * @access Private
 */
exports.getTodaySales = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);

        const result = await dashboardSummariesService.getTodaySales(branchConfig);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching today sales:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching today sales',
            error: error.message
        });
    }
};

/**
 * Get total incomes summary
 * @route GET /api/dashboard-summaries/total-incomes
 * @access Private
 */
exports.getTotalIncomes = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getTotalIncomes(branchConfig, startDate, endDate);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching total incomes:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching total incomes',
            error: error.message
        });
    }
};

/**
 * Get customer payments summary
 * @route GET /api/dashboard-summaries/customer-payments
 * @access Private
 */
exports.getCustomerPayments = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getCustomerPayments(branchConfig, startDate, endDate);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching customer payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching customer payments',
            error: error.message
        });
    }
};

/**
 * Get supplier payments summary
 * @route GET /api/dashboard-summaries/supplier-payments
 * @access Private
 */
exports.getSupplierPayments = async (req, res) => {
    try {
        const branchConfig = getBranchConfig(req);
        const startDate = parseDate(req.query.startDate);
        const endDate = parseDate(req.query.endDate);

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before or equal to endDate'
            });
        }

        const result = await dashboardSummariesService.getSupplierPayments(branchConfig, startDate, endDate);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching supplier payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching supplier payments',
            error: error.message
        });
    }
};
