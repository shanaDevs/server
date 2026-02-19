const { customerRefundItemController } = require('../../models');
// const { validationResult } = require('express-validator')


// Get all customer refund items
exports.getAllCustomerRefundItems = async (req, res) => {
    try {    
        const customerRefundItems = await customerRefundItemController.getAllCustomerRefundItems();
        res.status(200).json({
            success: true,
            message: 'Customer refund items fetched successfully',
            data: customerRefundItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer refund items',
            error: error.message
        });
    }
};