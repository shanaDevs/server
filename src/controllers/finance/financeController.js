const financeService = require('../../services/finance/financeService');
const { getBranchConfig } = require('../../utils/branchHelper');

/**
 * Get Finance Statistics for a range
 * @route GET /api/finance/statistics
 */
exports.getFinanceStatistics = async (req, res) => {
    try {
        const { startDate, endDate, date, counterId, counterSessionId } = req.query;
        const branchConfig = getBranchConfig(req);

        let start, end;

        if (date) {
            start = new Date(date);
            start.setHours(0, 0, 0, 0);
            end = new Date(date);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            // Default to today
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const statistics = await financeService.getFinanceStatistics(start, end, branchConfig, {
            counterId: counterId ? parseInt(counterId) : undefined,
            counterSessionId: counterSessionId ? parseInt(counterSessionId) : undefined
        });

        res.json({
            success: true,
            data: {
                period: {
                    start: start.toISOString(),
                    end: end.toISOString()
                },
                ...statistics
            }
        });
    } catch (error) {
        console.error('Error fetching finance statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching finance statistics',
            error: error.message
        });
    }
};

/**
 * Download Finance Excel Report
 * @route GET /api/finance/download-excel
 */
exports.downloadFinanceExcel = async (req, res) => {
    try {
        const { startDate, endDate, date, counterId, counterSessionId } = req.query;
        const branchConfig = getBranchConfig(req);

        let start, end;

        if (date) {
            start = new Date(date);
            start.setHours(0, 0, 0, 0);
            end = new Date(date);
            end.setHours(23, 59, 59, 999);
        } else if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const workbook = await financeService.generateFinanceExcel(start, end, branchConfig, {
            counterId: counterId ? parseInt(counterId) : undefined,
            counterSessionId: counterSessionId ? parseInt(counterSessionId) : undefined
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=finance_report_${start.toISOString().split('T')[0]}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error downloading finance report:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading finance report',
            error: error.message
        });
    }
};
