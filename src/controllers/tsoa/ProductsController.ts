import { Controller, Get, Post, Put, Delete, Route, Tags, Security, Body, Path, Query, SuccessResponse, Response } from 'tsoa';

/**
 * Product response interface
 */
export interface ProductResponse {
    productId: number;
    productCode: string;
    productName: string;
    description?: string;
    sellingPrice: number;
    costPrice: number;
    stockQuantity: number;
    status: string;
    categoryId?: number;
    companyId?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Create product request
 */
export interface CreateProductRequest {
    productCode: string;
    productName: string;
    description?: string;
    sellingPrice: number;
    costPrice: number;
    categoryId: number;
    companyId: number;
    brandId?: number;
    supplierId?: number;
    stockQuantity?: number;
    reorderLevel?: number;
    status?: 'active' | 'inactive';
}

/**
 * Update product request
 */
export interface UpdateProductRequest {
    productCode?: string;
    productName?: string;
    description?: string;
    sellingPrice?: number;
    costPrice?: number;
    categoryId?: number;
    companyId?: number;
    brandId?: number;
    supplierId?: number;
    stockQuantity?: number;
    reorderLevel?: number;
    status?: 'active' | 'inactive';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
}

/**
 * Standard API response
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
    success: false;
    message: string;
    errors?: any[];
}

/**
 * Products Controller
 * Handles all product-related operations
 */
@Route('tsoa/products')
@Tags('Products')
export class ProductsController extends Controller {
    /**
     * Get all products with pagination and search
     * @param page Page number (default: 1)
     * @param limit Items per page (default: 10, max: 100)
     * @param search Search query for product name or code
     * @summary Retrieve a paginated list of products
     * @returns Paginated list of products
     */
    @Get('/')
    @Security('bearerAuth')
    @SuccessResponse('200', 'Products retrieved successfully')
    @Response<ErrorResponse>('500', 'Internal server error')
    public async getProducts(
        @Query() page: number = 1,
        @Query() limit: number = 10,
        @Query() search?: string
    ): Promise<PaginatedResponse<ProductResponse>> {
        const { Product } = require('../../models');
        const { Op } = require('sequelize');

        try {
            const offset = (page - 1) * limit;
            const where: any = {};

            if (search) {
                where[Op.or] = [
                    { productName: { [Op.like]: `%${search}%` } },
                    { productCode: { [Op.like]: `%${search}%` } }
                ];
            }

            const { count, rows } = await Product.findAndCountAll({
                where,
                limit: Math.min(parseInt(String(limit)), 100),
                offset: parseInt(String(offset)),
                order: [['createdAt', 'DESC']]
            });

            return {
                success: true,
                data: rows,
                total: count,
                page: parseInt(String(page)),
                limit: parseInt(String(limit))
            };
        } catch (error: any) {
            this.setStatus(500);
            throw new Error(error.message);
        }
    }

    /**
     * Get a single product by ID
     * @param productId Product ID
     * @summary Retrieve a specific product
     * @returns Product details
     */
    @Get('{productId}')
    @Security('bearerAuth')
    @SuccessResponse('200', 'Product retrieved successfully')
    @Response<ErrorResponse>('404', 'Product not found')
    @Response<ErrorResponse>('500', 'Internal server error')
    public async getProduct(
        @Path() productId: number
    ): Promise<ApiResponse<ProductResponse>> {
        const { Product } = require('../../models');

        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                this.setStatus(404);
                throw new Error('Product not found');
            }

            return {
                success: true,
                data: product
            };
        } catch (error: any) {
            this.setStatus(error.message === 'Product not found' ? 404 : 500);
            throw error;
        }
    }

    /**
     * Create a new product
     * @param requestBody Product data
     * @summary Create a new product
     * @returns Created product
     */
    @Post('/')
    @Security('bearerAuth')
    @SuccessResponse('201', 'Product created successfully')
    @Response<ErrorResponse>('400', 'Invalid request data')
    @Response<ErrorResponse>('500', 'Internal server error')
    public async createProduct(
        @Body() requestBody: CreateProductRequest
    ): Promise<ApiResponse<ProductResponse>> {
        const { Product } = require('../../models');

        try {
            const product = await Product.create(requestBody);

            this.setStatus(201);
            return {
                success: true,
                data: product,
                message: 'Product created successfully'
            };
        } catch (error: any) {
            this.setStatus(400);
            throw new Error(error.message);
        }
    }

    /**
     * Update an existing product
     * @param productId Product ID
     * @param requestBody Updated product data
     * @summary Update a product
     * @returns Updated product
     */
    @Put('{productId}')
    @Security('bearerAuth')
    @SuccessResponse('200', 'Product updated successfully')
    @Response<ErrorResponse>('404', 'Product not found')
    @Response<ErrorResponse>('400', 'Invalid request data')
    @Response<ErrorResponse>('500', 'Internal server error')
    public async updateProduct(
        @Path() productId: number,
        @Body() requestBody: UpdateProductRequest
    ): Promise<ApiResponse<ProductResponse>> {
        const { Product } = require('../../models');

        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                this.setStatus(404);
                throw new Error('Product not found');
            }

            await product.update(requestBody);

            return {
                success: true,
                data: product,
                message: 'Product updated successfully'
            };
        } catch (error: any) {
            this.setStatus(error.message === 'Product not found' ? 404 : 400);
            throw error;
        }
    }

    /**
     * Delete a product
     * @param productId Product ID
     * @summary Delete a product
     * @returns Success message
     */
    @Delete('{productId}')
    @Security('bearerAuth')
    @SuccessResponse('200', 'Product deleted successfully')
    @Response<ErrorResponse>('404', 'Product not found')
    @Response<ErrorResponse>('500', 'Internal server error')
    public async deleteProduct(
        @Path() productId: number
    ): Promise<ApiResponse<null>> {
        const { Product } = require('../../models');

        try {
            const product = await Product.findByPk(productId);

            if (!product) {
                this.setStatus(404);
                throw new Error('Product not found');
            }

            await product.destroy();

            return {
                success: true,
                message: 'Product deleted successfully'
            };
        } catch (error: any) {
            this.setStatus(error.message === 'Product not found' ? 404 : 500);
            throw error;
        }
    }
}
