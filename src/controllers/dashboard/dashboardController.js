const dashboardService = require('../../services/dashboard/dashboardService');
const { getBranchConfig } = require('../../utils/branchHelper');

/**
 * Calculate date range based on query parameters
 */
function calculateDateRange(query) {
    const { range, startDate, endDate, date } = query;

    const now = new Date();
    let start, end, rangeType;

    // Priority 1: Preset range
    if (range) {
        rangeType = range;
        switch (range) {
            case 'today':
                start = new Date(now);
                start.setHours(0, 0, 0, 0);
                end = new Date(now);
                end.setHours(23, 59, 59, 999);
                break;

            case 'yesterday':
                start = new Date(now);
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end = new Date(now);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;

            case 'past_month':
                end = new Date(now);
                end.setHours(23, 59, 59, 999);
                start = new Date(now);
                start.setDate(start.getDate() - 30);
                start.setHours(0, 0, 0, 0);
                break;

            case 'past_year':
                end = new Date(now);
                end.setHours(23, 59, 59, 999);
                start = new Date(now);
                start.setDate(start.getDate() - 365);
                start.setHours(0, 0, 0, 0);
                break;

            default:
                throw new Error('Invalid range. Use: today, yesterday, past_month, or past_year');
        }
    }
    // Priority 2: Custom date range
    else if (startDate && endDate) {
        rangeType = 'custom';
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (start > end) {
            throw new Error('startDate must be before or equal to endDate');
        }
    }
    // Priority 3: Single date (backward compatibility)
    else if (date) {
        rangeType = 'single_day';
        start = new Date(date);
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
    }
    // Default: Today
    else {
        rangeType = 'today';
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
    }

    return {
        startDate: start,
        endDate: end,
        rangeType
    };
}

/**
 * Get dashboard statistics
 * @route GET /api/dashboard/statistics
 * @access Private
 */
exports.getDashboardStatistics = async (req, res) => {
    try {
        const { range, startDate, endDate, date } = req.query;
        const branchConfig = getBranchConfig(req);

        // Validate date formats if provided
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (date && !dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD format.'
            });
        }

        if (startDate && !dateRegex.test(startDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid startDate format. Please use YYYY-MM-DD format.'
            });
        }

        if (endDate && !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid endDate format. Please use YYYY-MM-DD format.'
            });
        }

        // Calculate date range
        let dateRange;
        try {
            dateRange = calculateDateRange(req.query);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Get statistics
        const statistics = await dashboardService.getDashboardStatistics(
            dateRange.startDate,
            dateRange.endDate,
            dateRange.rangeType,
            branchConfig
        );

        res.json({
            success: true,
            data: statistics
        });
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};
