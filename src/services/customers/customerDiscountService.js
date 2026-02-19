const { CustomerDiscount, Customer, Product } = require('../../models');

/**
 * Create a new customer discount
 * @param {Object} discountData - The discount data
 * @returns {Promise<Object>} Created discount
 */
const createCustomerDiscount = async (discountData) => {
    const { customerId, productId, discount_percentage, discount_amount } = discountData;

    // Check if customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
        throw new Error('Customer not found');
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    // Check if discount already exists for this customer-product combination
    const existingDiscount = await CustomerDiscount.findOne({
        where: { customerId, productId }
    });

    if (existingDiscount) {
        throw new Error('Discount already exists for this customer and product combination');
    }

    // Create the discount
    const discount = await CustomerDiscount.create({
        customerId,
        productId,
        discountPercentage: discount_percentage,
        discountAmount: discount_amount
    });

    // Fetch the created discount with related data
    return await CustomerDiscount.findByPk(discount.id, {
        include: [
            {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'customerName', 'phone', 'customerType']
            },
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'productCode', 'costPrice']
            }
        ]
    });
};

/**
 * Get all customer discounts
 * @param {Object} options - Query options
 * @returns {Promise<Object>} List of discounts
 */
const getAllCustomerDiscounts = async (options = {}) => {
    const { page = 1, limit = 10, customerId, productId } = options;
    const offset = (page - 1) * limit;

    const where = {};
    if (customerId) where.customerId = customerId;
    if (productId) where.productId = productId;

    const { count, rows } = await CustomerDiscount.findAndCountAll({
        where,
        include: [
            {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'customerName', 'phone', 'customerType']
            },
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'productCode', 'costPrice']
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });

    return {
        discounts: rows,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
        }
    };
};

/**
 * Get customer discount by customer and product ID
 * @param {number} customerId - Customer ID
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} Discount details
 */
const getCustomerDiscountByIds = async (customerId, productId) => {
    const discount = await CustomerDiscount.findOne({
        where: { customerId, productId },
        include: [
            {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'customerName', 'phone', 'customerType']
            },
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'productCode', 'costPrice']
            }
        ]
    });

    if (!discount) {
        throw new Error('Customer discount not found');
    }

    return discount;
};

/**
 * Get all discounts for a specific customer
 * @param {number} customerId - Customer ID
 * @returns {Promise<Array>} List of discounts for the customer
 */
const getDiscountsByCustomer = async (customerId) => {
    // Check if customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
        throw new Error('Customer not found');
    }

    const discounts = await CustomerDiscount.findAll({
        where: { customerId },
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'productCode', 'costPrice']
            }
        ],
        order: [['created_at', 'DESC']]
    });

    return discounts;
};

/**
 * Update customer discount
 * @param {number} customerId - Customer ID
 * @param {number} productId - Product ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated discount
 */
const updateCustomerDiscount = async (customerId, productId, updateData) => {
    const discount = await CustomerDiscount.findOne({
        where: { customerId, productId }
    });

    if (!discount) {
        throw new Error('Customer discount not found');
    }

    await discount.update(updateData);

    return await CustomerDiscount.findOne({
        where: { customerId, productId },
        include: [
            {
                model: Customer,
                as: 'customer',
                attributes: ['id', 'customerName', 'phone', 'customerType']
            },
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'productCode', 'costPrice']
            }
        ]
    });
};

/**
 * Delete customer discount
 * @param {number} customerId - Customer ID
 * @param {number} productId - Product ID
 * @returns {Promise<void>}
 */
const deleteCustomerDiscount = async (customerId, productId) => {
    const discount = await CustomerDiscount.findOne({
        where: { customerId, productId }
    });

    if (!discount) {
        throw new Error('Customer discount not found');
    }

    await discount.destroy();
};

module.exports = {
    createCustomerDiscount,
    getAllCustomerDiscounts,
    getCustomerDiscountByIds,
    getDiscountsByCustomer,
    updateCustomerDiscount,
    deleteCustomerDiscount
};
