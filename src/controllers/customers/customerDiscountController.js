const customerDiscountService = require('../../services/customers/customerDiscountService');
const { validationResult } = require('express-validator');

/**
 * Create a new customer discount
 */
const createCustomerDiscount = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const discount = await customerDiscountService.createCustomerDiscount(req.body);

        res.status(201).json({
            success: true,
            message: 'Customer discount created successfully',
            data: discount
        });
    } catch (error) {
        console.error('Error creating customer discount:', error);
        res.status(error.message.includes('not found') || error.message.includes('already exists') ? 400 : 500).json({
            success: false,
            message: error.message || 'Failed to create customer discount'
        });
    }
};

/**
 * Get all customer discounts
 */
const getAllCustomerDiscounts = async (req, res) => {
    try {
        const { page, limit, customerId, productId } = req.query;

        const result = await customerDiscountService.getAllCustomerDiscounts({
            page,
            limit,
            customerId,
            productId
        });

        res.status(200).json({
            success: true,
            data: result.discounts,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching customer discounts:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch customer discounts'
        });
    }
};

/**
 * Get customer discount by customer and product ID
 */
const getCustomerDiscountByIds = async (req, res) => {
    try {
        const { customerId, productId } = req.params;

        const discount = await customerDiscountService.getCustomerDiscountByIds(
            parseInt(customerId),
            parseInt(productId)
        );

        res.status(200).json({
            success: true,
            data: discount
        });
    } catch (error) {
        console.error('Error fetching customer discount:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Failed to fetch customer discount'
        });
    }
};

/**
 * Get all discounts for a specific customer
 */
const getDiscountsByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        const discounts = await customerDiscountService.getDiscountsByCustomer(
            parseInt(customerId)
        );

        res.status(200).json({
            success: true,
            data: discounts
        });
    } catch (error) {
        console.error('Error fetching customer discounts:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Failed to fetch customer discounts'
        });
    }
};

/**
 * Update customer discount
 */
const updateCustomerDiscount = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { customerId, productId } = req.params;

        const discount = await customerDiscountService.updateCustomerDiscount(
            parseInt(customerId),
            parseInt(productId),
            req.body
        );

        res.status(200).json({
            success: true,
            message: 'Customer discount updated successfully',
            data: discount
        });
    } catch (error) {
        console.error('Error updating customer discount:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Failed to update customer discount'
        });
    }
};

/**
 * Delete customer discount
 */
const deleteCustomerDiscount = async (req, res) => {
    try {
        const { customerId, productId } = req.params;

        await customerDiscountService.deleteCustomerDiscount(
            parseInt(customerId),
            parseInt(productId)
        );

        res.status(200).json({
            success: true,
            message: 'Customer discount deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting customer discount:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            message: error.message || 'Failed to delete customer discount'
        });
    }
};

module.exports = {
    createCustomerDiscount,
    getAllCustomerDiscounts,
    getCustomerDiscountByIds,
    getDiscountsByCustomer,
    updateCustomerDiscount,
    deleteCustomerDiscount
};
