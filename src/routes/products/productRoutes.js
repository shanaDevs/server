const express = require('express');
const router = express.Router();
const { productController } = require('../../controllers');
const { body } = require('express-validator');
const { checkPermission } = require('../../middlewares/auth');
const csvUpload = require('../../middlewares/csvUploadMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - companyId
 *         - name
 *         - costPrice
 *         - sellingPrice
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated product ID
 *         companyId:
 *           type: integer
 *           description: Company ID
 *         name:
 *           type: string
 *           description: Product name
 *         productCode:
 *           type: string
 *           description: Product code (auto-generated or manual)
 *         imageUrl:
 *           type: string
 *           description: Product image URL
 *         description:
 *           type: string
 *           description: Product description
 *         categoryId:
 *           type: integer
 *           description: Category ID
 *         brand:
 *           type: string
 *           description: Product brand
 *         unitOfMeasure:
 *           type: string
 *           description: Unit of measure (PCS, KG, L, etc.)
 *         costPrice:
 *           type: number
 *           format: decimal
 *           description: Cost price (purchase price)
 *         minStockLevel:
 *           type: integer
 *           description: Minimum stock level for alerts
 *         locationId:
 *           type: integer
 *           description: Storage location ID
 *         supplierId:
 *           type: integer
 *           description: Default supplier ID
 *         isActive:
 *           type: boolean
 *           description: Whether the product is active
 *         isTaxable:
 *           type: boolean
 *           description: Whether tax applies to this product (default true)
 *         taxRate:
 *           type: number
 *           format: decimal
 *           description: Product-specific tax rate (overrides system default if set)
 *         taxType:
 *           type: string
 *           enum: [percentage, fixed, system_default]
 *           description: Tax type - percentage, fixed amount, or use system default
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 */

// Validation rules for create
const productCreateValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('costPrice').isFloat({ min: 0 }).withMessage('Cost Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('sku').optional().trim(),
    body('category').optional().trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// Validation rules for update (costPrice optional)
const productUpdateValidation = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost Price must be a positive number'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('sku').optional().trim(),
    body('category').optional().trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with inventory details
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (use 100 for all products)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of products with inventory details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Product'
 *                       - type: object
 *                         properties:
 *                           currentBalance:
 *                             type: number
 *                             example: 12
 *                             description: Total available quantity across all batches
 *                           latestSellingPrice:
 *                             type: string
 *                             example: "2400.00"
 *                             description: Latest selling price from inventory
 *                           latestMrp:
 *                             type: string
 *                             example: "2500.00"
 *                             description: Latest MRP from inventory
 *                           latestUnitCost:
 *                             type: string
 *                             example: "2000.00"
 *                             description: Latest unit cost from inventory
 *                           batches:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 batchNumber:
 *                                   type: string
 *                                   example: BCH-0002
 *                                 expiryDate:
 *                                   type: string
 *                                   format: date
 *                                   nullable: true
 *                                   example: null
 *                                 quantity:
 *                                   type: number
 *                                   example: 12
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', checkPermission('view_products'), productController.getAllProducts);

/**
 * @swagger
 * /api/products/all:
 *   get:
 *     summary: Get all products without any restrictions
 *     description: Returns all products from the database without pagination or filtering
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                   description: Total number of products
 *       401:
 *         description: Unauthorized
 */
router.get('/all', checkPermission('view_products'), productController.getAllProductsUnrestricted);

/**
 * @swagger
 * /api/products/with-inventory:
 *   get:
 *     summary: Get products with inventory details
 *     description: Retrieves products joined with inventory table, supporting filters by categoryId and brandId. Returns products with all their inventory batches grouped by batch number.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: integer
 *         description: Filter by brand ID
 *       - in: query
 *         name: batchNumber
 *         schema:
 *           type: string
 *         description: Filter by batch number (partial match)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Products with inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       productCode:
 *                         type: string
 *                       categoryId:
 *                         type: integer
 *                       brandId:
 *                         type: integer
 *                       costPrice:
 *                         type: number
 *                       totalQuantity:
 *                         type: number
 *                         description: Total quantity across all batches
 *                       batchCount:
 *                         type: integer
 *                         description: Number of different batches
 *                       batches:
 *                         type: array
 *                         description: Inventory grouped by batch number
 *                         items:
 *                           type: object
 *                           properties:
 *                             batchNumber:
 *                               type: string
 *                             expiryDate:
 *                               type: string
 *                               format: date
 *                             quantity:
 *                               type: number
 *                             sellingPrice:
 *                               type: number
 *                             mrp:
 *                               type: number
 *                             unitCost:
 *                               type: number
 *                       inventories:
 *                         type: array
 *                         description: All inventory records for this product
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             batchNumber:
 *                               type: string
 *                             expiryDate:
 *                               type: string
 *                             quantity:
 *                               type: number
 *                             sellingPrice:
 *                               type: number
 *                             mrp:
 *                               type: number
 *                             unitCost:
 *                               type: number
 *                       applicablePromotions:
 *                         type: array
 *                         description: Active BOGO and Buy-X-Get-Y promotions applicable to this product
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               description: Promotion ID
 *                             code:
 *                               type: string
 *                               description: Promotion/coupon code
 *                               example: "BOGO2024"
 *                             type:
 *                               type: string
 *                               enum: [BOGO, BUY_X_GET_Y]
 *                               description: Promotion type
 *                             title:
 *                               type: string
 *                               description: Promotion title
 *                               example: "Buy One Get One Free"
 *                             buyQuantity:
 *                               type: integer
 *                               description: Quantity to buy
 *                               example: 1
 *                               default: 1
 *                             getQuantity:
 *                               type: integer
 *                               description: Quantity to get free
 *                               example: 1
 *                               default: 1
 *                             freeProductId:
 *                               type: integer
 *                               nullable: true
 *                               description: Free product ID (for BUY_X_GET_Y promotions)
 *                               example: 456
 *                             freeProductName:
 *                               type: string
 *                               nullable: true
 *                               description: Free product name (for BUY_X_GET_Y promotions)
 *                               example: "Product B"
 *                             freeProductCode:
 *                               type: string
 *                               nullable: true
 *                               description: Free product code (for BUY_X_GET_Y promotions)
 *                               example: "PRD-456"
 *                             freeProductUnit:
 *                               type: string
 *                               nullable: true
 *                               description: Free product unit of measure (for BUY_X_GET_Y promotions)
 *                               example: "pcs"
 *                             rewardProductId:
 *                               type: integer
 *                               nullable: true
 *                               description: Reward product ID (legacy field, use freeProductId)
 *                             rewardProductCode:
 *                               type: string
 *                               nullable: true
 *                               description: Reward product code (legacy field, use freeProductCode)
 *                             discountValue:
 *                               type: number
 *                               nullable: true
 *                               description: Fixed discount value
 *                             discountPercentage:
 *                               type: number
 *                               nullable: true
 *                               description: Percentage discount
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/with-inventory', checkPermission('view_products'), productController.getProductsWithInventory);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', checkPermission('view_products'), productController.getProductById);

/**
 * @swagger
 * /api/products/{id}/inventory:
 *   get:
 *     summary: Get product inventory details with batches
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product inventory details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     productCode:
 *                       type: string
 *                       example: PROD-001
 *                     productName:
 *                       type: string
 *                       example: Samsung Galaxy A54
 *                     unitOfMeasure:
 *                       type: string
 *                       example: pcs
 *                     currentBalance:
 *                       type: number
 *                       example: 12
 *                       description: Total available quantity across all batches
 *                     latestSellingPrice:
 *                       type: string
 *                       example: "2400.00"
 *                       description: Latest selling price from inventory
 *                     latestMrp:
 *                       type: string
 *                       example: "2500.00"
 *                       description: Latest MRP from inventory
 *                     latestUnitCost:
 *                       type: string
 *                       example: "2000.00"
 *                       description: Latest unit cost from inventory
 *                     batches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           batchNumber:
 *                             type: string
 *                             example: BCH-0002
 *                           expiryDate:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *                             example: null
 *                           quantity:
 *                             type: number
 *                             example: 12
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/inventory', checkPermission('view_products'), productController.getProductInventory);

const upload = require('../../middlewares/uploadMiddleware');

// ... (existing imports)

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - name
 *               - costPrice
 *             properties:
 *               companyId:
 *                 type: integer
 *               name:
 *                 type: string
 *               productCode:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Product image file
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               unitOfMeasure:
 *                 type: string
 *               costPrice:
 *                 type: number
 *               minStockLevel:
 *                 type: integer
 *               locationId:
 *                 type: integer
 *               supplierId:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               isTaxable:
 *                 type: boolean
 *                 description: Whether tax applies to this product (default true)
 *               taxRate:
 *                 type: number
 *                 description: Product-specific tax rate (overrides system default)
 *               taxType:
 *                 type: string
 *                 enum: [percentage, fixed, system_default]
 *                 description: Tax calculation type
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', checkPermission('create_products'), upload.array('image', 12), productCreateValidation, productController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               productCode:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               unitOfMeasure:
 *                 type: string
 *               costPrice:
 *                 type: number
 *               minStockLevel:
 *                 type: integer
 *               locationId:
 *                 type: integer
 *               supplierId:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *               isTaxable:
 *                 type: boolean
 *                 description: Whether tax applies to this product
 *               taxRate:
 *                 type: number
 *                 description: Product-specific tax rate
 *               taxType:
 *                 type: string
 *                 enum: [percentage, fixed, system_default]
 *                 description: Tax calculation type
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/:id', checkPermission('update_products'), upload.array('image', 12), productUpdateValidation, productController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', checkPermission('delete_products'), productController.deleteProduct);

/**
 * @swagger
 * /api/products/{id}/barcode:
 *   get:
 *     summary: Generate barcode for a single product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [png, base64]
 *           default: png
 *         description: Output format (png for image, base64 for JSON with base64 string)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [code128, ean13, upca, code39]
 *           default: code128
 *         description: Barcode type
 *       - in: query
 *         name: scale
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Scale factor for barcode size
 *       - in: query
 *         name: height
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Barcode height in millimeters
 *     responses:
 *       200:
 *         description: Barcode generated successfully
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     productName:
 *                       type: string
 *                     productCode:
 *                       type: string
 *                     barcode:
 *                       type: string
 *                       description: Base64 encoded barcode image
 *                     format:
 *                       type: string
 *       404:
 *         description: Product not found
 */
router.get('/:id/barcode', checkPermission('view_products'), productController.generateProductBarcode);

/**
 * @swagger
 * /api/products/{id}/qrcode:
 *   get:
 *     summary: Generate QR code for a single product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [png, base64]
 *           default: png
 *         description: Output format
 *       - in: query
 *         name: scale
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Scale factor for QR code size
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id/qrcode', checkPermission('view_products'), productController.generateProductQRCode);

/**
 * @swagger
 * /api/products/barcodes/bulk:
 *   post:
 *     summary: Generate barcodes for multiple products (bulk)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of product IDs
 *                 example: [1, 2, 3, 4, 5]
 *               format:
 *                 type: string
 *                 enum: [json]
 *                 default: json
 *                 description: Output format (always returns JSON with base64 images)
 *               type:
 *                 type: string
 *                 enum: [code128, ean13, upca, code39]
 *                 default: code128
 *                 description: Barcode type
 *               scale:
 *                 type: integer
 *                 default: 3
 *                 description: Scale factor
 *               height:
 *                 type: integer
 *                 default: 10
 *                 description: Barcode height in millimeters
 *     responses:
 *       200:
 *         description: Barcodes generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       productCode:
 *                         type: string
 *                       barcode:
 *                         type: string
 *                         description: Base64 encoded barcode image
 *       400:
 *         description: Invalid request (productIds array required)
 *       404:
 *         description: No products found
 */
router.post('/barcodes/bulk', checkPermission('view_products'), productController.generateBulkProductBarcodes);

/**
 * @swagger
 * /api/products/barcodes/all:
 *   get:
 *     summary: Generate barcodes for all active products (paginated)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of products per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [code128, ean13, upca, code39]
 *           default: code128
 *         description: Barcode type
 *       - in: query
 *         name: scale
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Scale factor
 *       - in: query
 *         name: height
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Barcode height in millimeters
 *     responses:
 *       200:
 *         description: Barcodes generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       productCode:
 *                         type: string
 *                       barcode:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       404:
 *         description: No products found
 */
router.get('/barcodes/all', checkPermission('view_products'), productController.generateAllProductBarcodes);

/**
 * @swagger
 * /api/products/filter:
 *   get:
 *     summary: Filter products by category, brand, batch, or active status
 *     description: Advanced filtering endpoint to search products based on multiple criteria including category, brand, batch number, and active status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *         example: 5
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: integer
 *         description: Filter by brand ID
 *         example: 3
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: integer
 *         description: Filter by batch ID
 *         example: 10
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (true for active, false for inactive)
 *         example: true
 *     responses:
 *       200:
 *         description: Filtered products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   description: Total number of products matching the filters
 *                   example: 15
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid filter parameters
 */
router.get('/filter', checkPermission('view_products'), productController.filterProducts);

/**
 * @swagger
 * /api/products/import:
 *   post:
 *     summary: Import products from CSV file
 *     description: Bulk import products from a CSV file. The CSV should have columns - name, product_code, description, category_id, unit_of_measure, cost_price, selling_price, mrp, min_stock_level, reorder_level, supplier_id, brand_id, branch_id, is_active
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing product data
 *     responses:
 *       201:
 *         description: Products imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Import completed. 50 products imported, 0 skipped"
 *                 data:
 *                   type: object
 *                   properties:
 *                     imported:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                           productId:
 *                             type: integer
 *                           productCode:
 *                             type: string
 *                           name:
 *                             type: string
 *                     skipped:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                           data:
 *                             type: object
 *                           reason:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRows:
 *                           type: integer
 *                         imported:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *       400:
 *         description: No file uploaded or CSV is empty
 *       401:
 *         description: Unauthorized
 */
router.post('/import',
    checkPermission('create_products'),
    csvUpload.single('file'),
    productController.importProductsFromCSV
);

module.exports = router;


