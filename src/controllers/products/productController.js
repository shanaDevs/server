const { Product, ProductAuditLog } = require('../../models');
const productService = require('../../services/products/productService');
const { validationResult } = require('express-validator');
const db = require('../../models');
const { Inventory, InventoryLedger } = db;
const { Op } = require('sequelize');
const { requireBranchId, addBranchFilter, addBranchId } = require('../../utils/branchHelper');
const { generateBarcode, generateBulkBarcodes, generateBarcodeBase64, generateQRCode } = require('../../utils/barcodeGenerator');

// Get all products
exports.getAllProducts = async (req, res, next) => {
    try {
        const { page, limit, category, isActive } = req.query;

        const filters = { category, isActive };
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        // If no pagination parameters provided, return all products
        const noPagination = page === undefined && limit === undefined;
        const pagination = noPagination
            ? { limit: null, offset: null }
            : { limit: parseInt(limit) || 10, offset: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 10) };

        const { count, rows } = await productService.getAllProducts(filters, pagination, branchConfig);
        const productsWithInventory = await productService.getProductInventoryDetails(rows, branchConfig);

        const response = {
            success: true,
            data: productsWithInventory
        };

        // Only include pagination info if pagination was requested
        if (!noPagination) {
            const parsedLimit = parseInt(limit) || 10;
            response.pagination = {
                total: count,
                page: parseInt(page) || 1,
                limit: parsedLimit,
                totalPages: Math.ceil(count / parsedLimit)
            };
        } else {
            response.total = count;
        }

        res.json(response);
    } catch (error) {
        next(error);
    }
};

// Get ALL products without any restrictions
exports.getAllProductsUnrestricted = async (req, res, next) => {
    try {
        const products = await Product.findAll({
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            data: products,
            total: products.length
        });
    } catch (error) {
        next(error);
    }
};

// Get single product by ID
exports.getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await productService.getProductById(id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
};


exports.createProduct = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const productData = {
            ...req.body,
            performedBy: req.user?.id,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        // ✅ MULTIPLE IMAGES → JSON ARRAY
        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(file => file.path);
        }

        addBranchId(productData, req);

        const product = await productService.createProduct(productData, transaction);
        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'SKU already exists' });
        }
        next(error);
    }
};


// Update product
exports.updateProduct = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const updateData = req.body;

        // ✅ MULTIPLE IMAGES HANDLING
        // Check if there are new files OR if existingImages is provided (to handle removals)
        if ((req.files && req.files.length > 0) || req.body.existingImages !== undefined) {
            const newImages = req.files ? req.files.map(file => file.path) : [];
            let finalImages = [];

            // 1. Handle existing images (retained)
            if (req.body.existingImages !== undefined) {
                try {
                    const rawExisting = req.body.existingImages;
                    let retainedImages = [];

                    if (typeof rawExisting === 'string') {
                        if (rawExisting.trim() === '') {
                            retainedImages = [];
                        } else {
                            try {
                                const parsed = JSON.parse(rawExisting);
                                retainedImages = Array.isArray(parsed) ? parsed : [rawExisting];
                            } catch (e) {
                                // Not JSON, assume single URL string
                                retainedImages = [rawExisting];
                            }
                        }
                    } else if (Array.isArray(rawExisting)) {
                        retainedImages = rawExisting;
                    }

                    finalImages = [...retainedImages];
                } catch (error) {
                    console.error('Error parsing existingImages:', error);
                    finalImages = [];
                }
            } else {
                // No existingImages provided: Append mode (Legacy behavior) or Replace based on flag
                if (req.body.replaceImages === 'true') {
                    finalImages = []; // Will just use newImages
                } else {
                    // Append to DB images (fetch existing)
                    const existingProduct = await Product.findByPk(id);
                    if (existingProduct && existingProduct.images && Array.isArray(existingProduct.images)) {
                        finalImages = [...existingProduct.images];
                    }
                }
            }

            // 2. Add new images
            finalImages = [...finalImages, ...newImages];

            // 3. Limit to 12 images and update data
            updateData.images = finalImages.slice(0, 12);
        }

        const userContext = {
            userId: req.user?.id,
            branchId: req.branchId,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || ''
        };

        const updatedProduct = await productService.updateProduct(id, updateData, userContext, transaction);
        if (!updatedProduct) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        await transaction.commit();

        res.json({ success: true, message: 'Product updated successfully', data: updatedProduct });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, message: 'SKU already exists' });
        }
        next(error);
    }
};

// Delete product (soft delete by setting isActive to false)
exports.deleteProduct = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const userContext = {
            userId: req.user?.id,
            branchId: req.branchId,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'] || ''
        };

        const deleted = await productService.deleteProduct(id, userContext, transaction);
        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        await transaction.commit();
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

// Get product inventory details with batches
exports.getProductInventory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchConfig = { branchId: req.branchId, branchAccess: req.user?.branchAccess };

        const product = await productService.getProductById(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        const inventoryDetails = await productService.getProductInventoryDetails([product], branchConfig);
        const details = inventoryDetails && inventoryDetails.length > 0 ? inventoryDetails[0] : null;

        res.json({ success: true, data: details });
    } catch (error) {
        next(error);
    }
};

// Generate barcode for a single product
exports.generateProductBarcode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { format = 'png', type = 'code128', scale = 3, height = 10 } = req.query;

        // Fetch product with branch filtering
        const where = { id };
        addBranchFilter(where, req);

        const product = await Product.findOne({ where });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Use productCode or SKU as barcode value
        const barcodeValue = product.productCode || product.sku || product.id.toString();

        const options = {
            bcid: type,
            scale: parseInt(scale),
            height: parseInt(height),
            includetext: true,
            textxalign: 'center'
        };

        if (format === 'base64') {
            const base64Barcode = await productService.generateBarcode('product', barcodeValue, { ...options, format });
            res.json({ success: true, data: { productId: product.id, productName: product.name, productCode: barcodeValue, barcode: base64Barcode, format: 'base64' } });
        } else {
            const barcodeBuf = await productService.generateBarcode('product', barcodeValue, { ...options, format });
            res.setHeader('Content-Type', 'image/png');
            res.send(barcodeBuf);
        }

    } catch (error) {
        next(error);
    }
};

// Generate barcodes for multiple products (bulk)
exports.generateBulkProductBarcodes = async (req, res, next) => {
    try {
        const { productIds, format = 'json', type = 'code128', scale = 3, height = 10 } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'productIds array is required'
            });
        }

        // Fetch products with branch filtering
        const where = {
            id: { [Op.in]: productIds }
        };
        addBranchFilter(where, req);

        const products = await Product.findAll({ where });

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No products found'
            });
        }

        // Prepare items for bulk barcode generation
        const items = products.map(product => ({
            value: product.productCode || product.sku || product.id.toString(),
            label: product.name,
            productId: product.id
        }));

        const options = {
            bcid: type,
            scale: parseInt(scale),
            height: parseInt(height),
            includetext: true,
            textxalign: 'center'
        };

        const barcodes = await generateBulkBarcodes(items, options);

        // Convert barcodes to base64 for JSON response
        const barcodesWithBase64 = barcodes.map(bc => ({
            label: bc.label,
            productCode: bc.productCode,
            barcode: `data:image/png;base64,${bc.barcode.toString('base64')}`
        }));

        res.json({
            success: true,
            message: `Generated ${barcodes.length} barcodes`,
            data: barcodesWithBase64
        });
    } catch (error) {
        next(error);
    }
};

// Generate barcode for all products with pagination
exports.generateAllProductBarcodes = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, type = 'code128', scale = 3, height = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Fetch products with branch filtering
        const where = { isActive: true };
        addBranchFilter(where, req);

        const { count, rows: products } = await Product.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']]
        });

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No products found'
            });
        }

        // Prepare items for bulk barcode generation
        const items = products.map(product => ({
            value: product.productCode || product.sku || product.id.toString(),
            label: product.name,
            productId: product.id
        }));

        const options = {
            bcid: type,
            scale: parseInt(scale),
            height: parseInt(height),
            includetext: true,
            textxalign: 'center'
        };

        const barcodes = await generateBulkBarcodes(items, options);

        // Convert barcodes to base64
        const barcodesWithBase64 = barcodes.map(bc => ({
            label: bc.label,
            productCode: bc.productCode,
            barcode: `data:image/png;base64,${bc.barcode.toString('base64')}`
        }));

        res.json({
            success: true,
            message: `Generated barcodes for page ${page}`,
            data: barcodesWithBase64,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// Generate QR code for product (with product details)
exports.generateProductQRCode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { format = 'png', scale = 5 } = req.query;

        // Fetch product with branch filtering
        const where = { id };
        addBranchFilter(where, req);

        const product = await Product.findOne({ where });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Create QR code data with product information
        const qrData = JSON.stringify({
            productId: product.id,
            productCode: product.productCode || product.sku,
            name: product.name,
            price: product.sellingPrice,
            brand: product.brand,
            category: product.category
        });

        const options = {
            scale: parseInt(scale),
            height: 20,
            width: 20
        };

        if (format === 'base64') {
            const qrBuffer = await generateQRCode(qrData, options);
            const base64QR = `data:image/png;base64,${qrBuffer.toString('base64')}`;
            res.json({
                success: true,
                data: {
                    productId: product.id,
                    productName: product.name,
                    qrCode: base64QR,
                    format: 'base64'
                }
            });
        } else {
            const qrCode = await generateQRCode(qrData, options);
            res.set('Content-Type', 'image/png');
            res.set('Content-Disposition', `inline; filename="qrcode-${product.productCode || product.id}.png"`);
            res.send(qrCode);
        }
    } catch (error) {
        next(error);
    }
};

// GET /api/products/filter
exports.filterProducts = async (req, res, next) => {
    try {
        const {
            categoryId,
            brandId,
            batchId,
            isActive
        } = req.query;

        const filters = {
            categoryId,
            brandId,
            batchId,
            isActive
        };

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const result = await productService.filterProducts(
            filters,
            branchConfig
        );

        res.json({
            success: true,
            total: result.count,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get products with inventory details
 * Supports filtering by categoryId, brandId, batchNumber
 * Returns products with all inventory batches grouped and aggregated
 */
exports.getProductsWithInventory = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            categoryId,
            brandId,
            isActive,
            batchNumber
        } = req.query;

        const offset = (page - 1) * limit;

        const filters = {
            categoryId,
            brandId,
            isActive,
            batchNumber
        };

        const pagination = {
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const branchConfig = {
            branchId: req.branchId,
            branchAccess: req.user?.branchAccess
        };

        const result = await productService.getProductsWithInventory(
            filters,
            pagination,
            branchConfig
        );

        res.json({
            success: true,
            data: result.rows,
            mostSelling: result.mostSelling,   // 🔹 ADDED
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Import products from CSV file
 * POST /api/products/import
 */
exports.importProductsFromCSV = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CSV file uploaded'
            });
        }

        const fs = require('fs');
        const csv = require('csv-parser');
        const path = require('path');

        const results = [];
        const errors = [];
        let rowNumber = 0;

        // Read and parse CSV file
        const filePath = req.file.path;

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    rowNumber++;
                    results.push({ ...data, rowNumber });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (results.length === 0) {
            await transaction.rollback();
            // Clean up uploaded file
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty'
            });
        }

        const importedProducts = [];
        const skippedProducts = [];

        // Process each row
        for (const row of results) {
            try {
                // Validate required fields
                if (!row.name || !row.product_code) {
                    skippedProducts.push({
                        row: row.rowNumber,
                        data: row,
                        reason: 'Missing required fields: name or product_code'
                    });
                    continue;
                }

                // Check if product already exists
                const existingProduct = await Product.findOne({
                    where: { productCode: row.product_code },
                    transaction
                });

                if (existingProduct) {
                    skippedProducts.push({
                        row: row.rowNumber,
                        data: row,
                        reason: `Product with code ${row.product_code} already exists`
                    });
                    continue;
                }

                // Auto-create or find Category
                let categoryId = null;
                if (row.category_name) {
                    let category = await db.Category.findOne({
                        where: { name: row.category_name },
                        transaction
                    });

                    if (!category) {
                        category = await db.Category.create({
                            name: row.category_name,
                            description: row.category_description || null,
                            branchId: req.branchId
                        }, { transaction });
                    }
                    categoryId = category.id;
                } else if (row.category_id) {
                    categoryId = parseInt(row.category_id);
                }

                // Auto-create or find Brand
                let brandId = null;
                if (row.brand_name) {
                    let brand = await db.Brand.findOne({
                        where: { name: row.brand_name },
                        transaction
                    });

                    if (!brand) {
                        brand = await db.Brand.create({
                            name: row.brand_name,
                            description: row.brand_description || null,
                            branchId: req.branchId
                        }, { transaction });
                    }
                    brandId = brand.id;
                } else if (row.brand_id) {
                    brandId = parseInt(row.brand_id);
                }

                // Auto-create or find Supplier
                let supplierId = null;
                if (row.supplier_name) {
                    let supplier = await db.Suppliers.findOne({
                        where: { name: row.supplier_name },
                        transaction
                    });

                    if (!supplier) {
                        // For auto-created suppliers, we need a company
                        // Try to find or create a company with the same name
                        let company = await db.Companies.findOne({
                            where: { name: row.supplier_name },
                            transaction
                        });

                        if (!company) {
                            company = await db.Companies.create({
                                name: row.supplier_name,
                                phoneNumber: row.supplier_phone || '0000000000',
                                branchId: req.branchId
                            }, { transaction });
                        }

                        supplier = await db.Suppliers.create({
                            companyId: company.id,
                            name: row.supplier_name,
                            contactPerson: row.supplier_contact_person || null,
                            phone: row.supplier_phone || null,
                            email: row.supplier_email || null,
                            address: row.supplier_address || null,
                            city: row.supplier_city || null,
                            country: row.supplier_country || null,
                            branchId: req.branchId
                        }, { transaction });
                    }
                    supplierId = supplier.id;
                } else if (row.supplier_id) {
                    supplierId = parseInt(row.supplier_id);
                }

                // Prepare product data
                const productData = {
                    name: row.name,
                    productCode: row.product_code,
                    description: row.description || null,
                    categoryId: categoryId,
                    brandId: brandId,
                    unitOfMeasure: row.unit_of_measure || 'pcs',
                    costPrice: row.cost_price ? parseFloat(row.cost_price) : 0,
                    sellingPrice: row.selling_price ? parseFloat(row.selling_price) : 0,
                    mrp: row.mrp ? parseFloat(row.mrp) : null,
                    minStockLevel: row.min_stock_level ? parseInt(row.min_stock_level) : 0,
                    reorderLevel: row.reorder_level ? parseInt(row.reorder_level) : 0,
                    supplierId: supplierId,
                    branchId: req.branchId,
                    isActive: row.is_active !== undefined ? row.is_active === '1' || row.is_active === 'true' : true,
                    barcode: row.barcode || row.product_code,
                    sku: row.sku || row.product_code,
                    images: row.images ? JSON.parse(row.images) : [],
                    isTaxable: row.is_taxable !== undefined ? row.is_taxable === '1' || row.is_taxable === 'true' : true,
                    taxRate: row.tax_rate ? parseFloat(row.tax_rate) : null,
                    taxType: row.tax_type || 'system_default'
                };

                // Create product
                const product = await Product.create(productData, { transaction });

                // Log audit
                await ProductAuditLog.create({
                    productId: product.id,
                    action: 'created',
                    fieldChanged: 'CSV_IMPORT',
                    oldValue: null,
                    newValue: JSON.stringify(productData),
                    changedBy: req.user?.id || null,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'] || '',
                    branchId: product.branchId
                }, { transaction });

                importedProducts.push({
                    row: row.rowNumber,
                    productId: product.id,
                    productCode: product.productCode,
                    name: product.name
                });

            } catch (error) {
                let reason = error.message;
                if (error.name === 'SequelizeForeignKeyConstraintError') {
                    if (reason.includes('category_id')) reason = `Category ID ${row.category_id} not found`;
                    else if (reason.includes('brand_id')) reason = `Brand ID ${row.brand_id} not found`;
                    else if (reason.includes('supplier_id')) reason = `Supplier ID ${row.supplier_id} not found`;
                    else reason = 'Invalid reference ID (Category, Brand, or Supplier)';
                }
                skippedProducts.push({
                    row: row.rowNumber,
                    data: row,
                    reason: reason
                });
            }
        }

        await transaction.commit();

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.status(201).json({
            success: true,
            message: `Import completed. ${importedProducts.length} products imported, ${skippedProducts.length} skipped`,
            data: {
                imported: importedProducts,
                skipped: skippedProducts,
                summary: {
                    totalRows: results.length,
                    imported: importedProducts.length,
                    skipped: skippedProducts.length
                }
            }
        });

    } catch (error) {
        await transaction.rollback();

        // Clean up uploaded file if it exists
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }

        next(error);
    }
};
