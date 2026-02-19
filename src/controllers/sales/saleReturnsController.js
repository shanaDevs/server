const { validationResult } = require('express-validator');
const db = require('../../models');
const { Sale, SaleItem, SaleReturnItem, Product, Inventory, ProductAuditLog, sequelize } = db;
const { Op } = require('sequelize');

/**
 * Add return items to an existing sale
 * POST /api/sales/:id/add-returns
 */
exports.addReturnsToSale = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const { returnItems, returnReason } = req.body;

        // Validate input
        if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'Return items array is required and must not be empty'
            });
        }

        // Find the sale
        const sale = await Sale.findByPk(id, {
            include: [
                {
                    model: SaleItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                },
                { model: SaleReturnItem, as: 'returnItems' }
            ],
            transaction
        });

        if (!sale) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Process each return item
        let returnSubtotal = 0;
        let returnDiscountAmount = 0;

        for (const returnItem of returnItems) {
            const { productId, quantity, unitPrice, discountAmount = 0, discountPercentage = 0, condition = 'good' } = returnItem;

            // Validate return item
            if (!productId || !quantity || quantity <= 0) {
                await transaction.rollback();
                return res.status(400).json({
                    message: 'Each return item must have productId and positive quantity'
                });
            }

            // Find the product
            const product = await Product.findByPk(productId, { transaction });
            if (!product) {
                await transaction.rollback();
                return res.status(404).json({
                    message: `Product with ID ${productId} not found`
                });
            }

            // Find the original sale item to get the price
            const saleItem = sale.items.find(item => item.productId === productId);
            const itemUnitPrice = unitPrice || (saleItem ? saleItem.unitPrice : product.sellingPrice);

            // Calculate return amounts
            const itemSubtotal = parseFloat(quantity) * parseFloat(itemUnitPrice);
            const itemDiscount = discountAmount || (itemSubtotal * (discountPercentage / 100));
            const itemTotal = itemSubtotal - itemDiscount;

            returnSubtotal += itemSubtotal;
            returnDiscountAmount += itemDiscount;

            // Create return item record
            await SaleReturnItem.create({
                saleId: sale.id,
                productId: productId,
                productName: product.name,
                quantity: quantity,
                unitPrice: itemUnitPrice,
                discountAmount: itemDiscount,
                discountPercentage: discountPercentage,
                totalAmount: itemTotal,
                returnReason: returnReason || returnItem.returnReason,
                condition: condition
            }, { transaction });

            // Restore inventory - create a new positive inventory entry
            const latestBatch = await Inventory.findOne({
                where: {
                    productId: productId,
                    quantity: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (latestBatch) {
                await Inventory.create({
                    productId: productId,
                    grnId: latestBatch.grnId,
                    supplierId: latestBatch.supplierId,
                    supplierName: latestBatch.supplierName,
                    supplierPhone: latestBatch.supplierPhone,
                    referenceType: 'sale_return',
                    batchNumber: latestBatch.batchNumber,
                    expiryDate: latestBatch.expiryDate,
                    locationId: latestBatch.locationId,
                    branchId: sale.branchId,
                    quantity: quantity, // Positive for stock in
                    unitCost: latestBatch.unitCost,
                    sellingPrice: latestBatch.sellingPrice,
                    mrp: latestBatch.mrp,
                    performedBy: req.user.id,
                    remarks: `Return from sale ${sale.saleNumber} - Restored to batch ${latestBatch.batchNumber || 'NO-BATCH'}`
                }, { transaction });
            } else {
                // Create new inventory batch if none exists
                await Inventory.create({
                    productId: productId,
                    referenceType: 'sale_return',
                    quantity: quantity,
                    branchId: sale.branchId,
                    unitCost: product.costPrice || 0,
                    sellingPrice: itemUnitPrice,
                    performedBy: req.user.id,
                    remarks: `Return from sale ${sale.saleNumber} - New batch created`
                }, { transaction });
            }

            // Log to product audit
            await ProductAuditLog.create({
                productId: productId,
                action: 'return_from_sale',
                changedBy: req.user.id,
                quantityBefore: product.stockQuantity || 0,
                quantityAfter: (product.stockQuantity || 0) + parseFloat(quantity),
                changeDetails: JSON.stringify({
                    saleId: sale.id,
                    saleNumber: sale.saleNumber,
                    returnQuantity: quantity,
                    reason: returnReason || returnItem.returnReason,
                    condition: condition
                })
            }, { transaction });
        }

        // Calculate net return value and net payable
        const returnTotalAmount = returnSubtotal - returnDiscountAmount;
        const netPayable = parseFloat(sale.totalAmount) - returnTotalAmount;

        // Update sale with return information
        await sale.update({
            returnSubtotal: returnSubtotal,
            returnDiscountAmount: returnDiscountAmount,
            returnTotalAmount: returnTotalAmount,
            netPayable: netPayable,
            // Update paid amount and credit amount if needed
            creditAmount: Math.max(0, netPayable - parseFloat(sale.paidAmount))
        }, { transaction });

        await transaction.commit();

        // Fetch updated sale with all relations
        const updatedSale = await Sale.findByPk(id, {
            include: [
                { model: SaleItem, as: 'items' },
                { model: SaleReturnItem, as: 'returnItems' }
            ]
        });

        res.status(200).json({
            message: 'Returns added successfully',
            sale: updatedSale,
            returnSummary: {
                returnSubtotal,
                returnDiscountAmount,
                returnTotalAmount,
                netPayable
            }
        });

    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error adding returns to sale:', error);
        res.status(500).json({
            message: 'Error adding returns to sale',
            error: error.message
        });
    }
};

/**
 * Get return items for a sale
 * GET /api/sales/:id/returns
 */
exports.getSaleReturns = async (req, res) => {
    try {
        const { id } = req.params;

        const sale = await Sale.findByPk(id, {
            include: [
                {
                    model: SaleReturnItem,
                    as: 'returnItems',
                    include: [{ model: Product, as: 'product' }]
                }
            ]
        });

        if (!sale) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        res.status(200).json({
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            returnItems: sale.returnItems,
            returnSummary: {
                returnSubtotal: sale.returnSubtotal,
                returnDiscountAmount: sale.returnDiscountAmount,
                returnTotalAmount: sale.returnTotalAmount,
                netPayable: sale.netPayable
            }
        });

    } catch (error) {
        console.error('Error fetching sale returns:', error);
        res.status(500).json({
            message: 'Error fetching sale returns',
            error: error.message
        });
    }
};
