const { Controller, Get, Post, Put, Delete, Route, Tags, Security, Body, Path, Query, SuccessResponse, Response } = require('tsoa');
const { Product } = require('../../models');

/**
 * Product response interface
 * @typedef {Object} ProductResponse
 * @property {number} productId - Product ID
 * @property {string} productCode - Product code
 * @property {string} productName - Product name
 * @property {string} description - Product description
 * @property {number} sellingPrice - Selling price
 * @property {number} costPrice - Cost price
 * @property {number} stockQuantity - Stock quantity
 * @property {string} status - Product status
 */

/**
 * Create product request
 * @typedef {Object} CreateProductRequest
 * @property {string} productCode - Product code
 * @property {string} productName - Product name
 * @property {string} description - Product description
 * @property {number} sellingPrice - Selling price
 * @property {number} costPrice - Cost price
 * @property {number} categoryId - Category ID
 * @property {number} companyId - Company ID
 */

/**
 * Error response
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Success status
 * @property {string} message - Error message
 */

/**
 * Products Controller
 * Handles all product-related operations using TSOA decorators
 * 
 * @route /api/tsoa/products
 * @tags Products
 */
class ProductsController extends Controller {
    /**
     * Get all products with pagination
     * @param {number} page - Page number (default: 1)
     * @param {number} limit - Items per page (default: 10)
     * @param {string} search - Search query
     * @returns {Promise<{success: boolean, data: ProductResponse[], total: number, page: number, limit: number}>}
     * 
     * @example page 1
     * @example limit 10
     * @example search "phone"
     */
    async getProducts(page = 1, limit = 10, search = '') {
        try {
            const offset = (page - 1) * limit;
            const where = {};

            if (search) {
                where[Op.or] = [
                    { productName: { [Op.like]: `%${search}%` } },
                    { productCode: { [Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows } = await Product.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            return {
                success: true,
                data: rows,
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            };
        } catch (error) {
            this.setStatus(500);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get a single product by ID
     * @param {number} productId - Product ID
     * @returns {Promise<{success: boolean, data: ProductResponse}>}
     * 
     * @example productId 1
     */
    async getProduct(productId) {
        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                this.setStatus(404);
                return {
                    success: false,
                    message: 'Product not found'
                };
            }

            return {
                success: true,
                data: product
            };
        } catch (error) {
            this.setStatus(500);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Create a new product
     * @param {CreateProductRequest} requestBody - Product data
     * @returns {Promise<{success: boolean, data: ProductResponse, message: string}>}
     * 
     * @example requestBody {
     *   "productCode": "PROD001",
     *   "productName": "Sample Product",
     *   "description": "A sample product",
     *   "sellingPrice": 100,
     *   "costPrice": 50,
     *   "categoryId": 1,
     *   "companyId": 1
     * }
     */
    async createProduct(requestBody) {
        try {
            const product = await Product.create(requestBody);

            this.setStatus(201);
            return {
                success: true,
                data: product,
                message: 'Product created successfully'
            };
        } catch (error) {
            this.setStatus(400);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Update a product
     * @param {number} productId - Product ID
     * @param {Partial<CreateProductRequest>} requestBody - Updated product data
     * @returns {Promise<{success: boolean, data: ProductResponse, message: string}>}
     */
    async updateProduct(productId, requestBody) {
        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                this.setStatus(404);
                return {
                    success: false,
                    message: 'Product not found'
                };
            }

            await product.update(requestBody);

            return {
                success: true,
                data: product,
                message: 'Product updated successfully'
            };
        } catch (error) {
            this.setStatus(400);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Delete a product
     * @param {number} productId - Product ID
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteProduct(productId) {
        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                this.setStatus(404);
                return {
                    success: false,
                    message: 'Product not found'
                };
            }

            await product.destroy();

            return {
                success: true,
                message: 'Product deleted successfully'
            };
        } catch (error) {
            this.setStatus(500);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = { ProductsController };
