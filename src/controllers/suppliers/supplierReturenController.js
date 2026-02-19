// const { SupplierReturn, Payment } = require('../../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

const { Inventory, Product, ProductAuditLog, sequelize, SupplierReturn, Payment, Suppliers } = require("../../models");

exports.createSupplierReturn = async (req, res, next) => {
    const transaction = await sequelize.transaction();

    try {
        // 1️⃣ Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            productId,
            inventoryId,
            returnDate,
            inventoryReferenceNo,
            remarks,
            quantity
        } = req.body;

        let { supplierId } = req.body;

        if (!productId || !quantity) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "productId and quantity are required"
            });
        }

        const user = {
            id: req.user?.id || null,
            name: req.user?.userName || req.user?.phone || "System"
        };

        // Get branchId from middleware or request body
        const branchId = req.currentBranchId || req.body.branchId || null;

        // 🔹 If supplierId not provided, get it from the last inventory row
        if (!supplierId) {
            const lastInventory = await Inventory.findOne({
                where: {
                    productId,
                    quantity: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (lastInventory && lastInventory.supplierId) {
                supplierId = lastInventory.supplierId;
                console.log(`✅ Auto-selected supplier ID ${supplierId} from last inventory row`);
            } else {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "No supplier found in inventory. Please provide supplierId."
                });
            }
        }

        // 2️⃣ Create SupplierReturn record
        const supplierReturn = await SupplierReturn.create({
            supplierId,
            productId,
            inventoryId,
            returnDate,
            inventoryReferenceNo,
            remarks,
            quantity,
            performedByUserId: user.id,
            branchId
        }, { transaction });

        // 3️⃣ Get product info
        const product = await Product.findByPk(productId, { transaction });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // 4️⃣ Get inventory batches using FIFO (same as sales)
        const inventoryWhere = {
            productId,
            quantity: { [Op.gt]: 0 }
        };
        if (branchId) inventoryWhere.branchId = branchId;

        const inventoryBatches = await Inventory.findAll({
            where: inventoryWhere,
            order: [
                [sequelize.literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
                ['expiryDate', 'ASC'],
                ['createdAt', 'ASC']
            ],
            transaction
        });

        const currentBalance = inventoryBatches.reduce((sum, batch) => sum + parseFloat(batch.quantity), 0);

        if (currentBalance < quantity) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Current: ${currentBalance}, Requested: ${quantity}`
            });
        }

        // 5️⃣ Create return transactions using FIFO (without updating existing rows - ledger principle)
        let remainingQuantity = quantity;

        for (const batch of inventoryBatches) {
            if (remainingQuantity <= 0) break;

            const deductQuantity = Math.min(remainingQuantity, parseFloat(batch.quantity));

            // ⚠️ DO NOT UPDATE the batch - inventory is a ledger (immutable)
            // Just create a new negative entry to record the return

            // Create Inventory Transaction - Copy all data from the batch
            await Inventory.create({
                productId,
                grnId: batch.grnId, // Copy GRN reference
                supplierId: supplierId || batch.supplierId, // Use provided or copy from batch
                supplierName: batch.supplierName, // Copy supplier name
                supplierPhone: batch.supplierPhone, // Copy supplier phone
                referenceType: "return",
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                locationId: batch.locationId, // Copy location
                branchId: branchId || batch.branchId,
                quantity: -deductQuantity, // Negative for return
                unitCost: batch.unitCost,
                sellingPrice: batch.sellingPrice,
                mrp: batch.mrp,
                performedBy: user.id,
                remarks: `SupplierReturn#${supplierReturn.id} - ${remarks || ""} - Batch: ${batch.batchNumber || 'NO-BATCH'}`
            }, { transaction });

            remainingQuantity -= deductQuantity;
        }

        const newBalance = currentBalance - quantity;

        // 6️⃣ Create Product Audit Log
        await ProductAuditLog.create({
            productId,
            action: "stock_adjusted",
            field: "stock_balance",
            oldValue: String(currentBalance),
            newValue: String(newBalance),
            changedBy: user.id,
            notes: `Supplier return ${quantity} units`
        }, { transaction });

        // 7️⃣ Calculate return amount & create Payment record
        const returnAmount = Number(quantity) * Number(product.costPrice || 0);

        const payment = await Payment.create({
            amountPaid: 0,
            balanceAmount: -returnAmount,
            paymentMethod: 'CASH',
            note: `Supplier return for product ${productId}, Qty ${quantity}`,
            createdBy: user.id,
            branchId
        }, { transaction });

        // 8️⃣ Commit transaction
        await transaction.commit();

        // 9️⃣ Send email notification to supplier (async, don't wait)
        (async () => {
            try {
                const supplier = await Suppliers.findByPk(supplierId);

                if (supplier && supplier.email) {
                    const nodemailer = require('nodemailer');
                    const db = require('../../models');

                    // Create email log entry
                    let emailLog = null;
                    try {
                        emailLog = await db.EmailLog.create({
                            emailType: 'supplier_return',
                            subject: `Supplier Return Notification - Return #${supplierReturn.id}`,
                            recipientEmail: supplier.email,
                            recipientName: supplier.name,
                            senderEmail: process.env.EMAIL_USER,
                            status: 'pending',
                            relatedEntityType: 'SupplierReturn',
                            relatedEntityId: supplierReturn.id,
                            relatedEntityRef: `RETURN-${supplierReturn.id}`,
                            supplierId: supplier.id,
                            branchId,
                            createdBy: user.id
                        });
                    } catch (logErr) {
                        console.warn('⚠️ Failed to create email log:', logErr.message);
                    }

                    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                        console.warn('⚠️ Email credentials not configured. Skipping supplier return email.');
                        if (emailLog) {
                            await emailLog.update({ status: 'failed', errorMessage: 'Email credentials not configured' });
                        }
                        return;
                    }

                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS
                        }
                    });

                    const htmlContent = `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <div style="background-color: #ff9800; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
                                <h2 style="margin: 0;">📦 Supplier Return Notification</h2>
                            </div>
                            
                            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                                <p>Dear ${supplier.name},</p>
                                <p>This is to inform you that we are returning the following product:</p>
                                
                                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                    <p style="margin: 0;"><strong>Return ID:</strong> RETURN-${supplierReturn.id}</p>
                                    <p style="margin: 10px 0 0 0;"><strong>Product:</strong> ${product.name}</p>
                                    <p style="margin: 10px 0 0 0;"><strong>Product Code:</strong> ${product.productCode || 'N/A'}</p>
                                    <p style="margin: 10px 0 0 0;"><strong>Quantity Returned:</strong> ${quantity}</p>
                                    <p style="margin: 10px 0 0 0;"><strong>Return Date:</strong> ${new Date().toLocaleDateString()}</p>
                                    ${remarks ? `<p style="margin: 10px 0 0 0;"><strong>Remarks:</strong> ${remarks}</p>` : ''}
                                </div>
                                
                                <p style="margin-top: 20px;">Please arrange for pickup or provide further instructions for the return process.</p>
                                
                                <p style="margin-top: 20px;">Thank you for your cooperation,</p>
                                <p><strong>POS System</strong></p>
                            </div>
                            
                            <div style="background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px;">
                                This is an automated message. Please contact us if you have any questions.
                            </div>
                        </div>
                    `;

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: supplier.email,
                        subject: `Supplier Return Notification - Return #${supplierReturn.id}`,
                        html: htmlContent
                    };

                    const info = await transporter.sendMail(mailOptions);
                    console.log(`✅ Supplier return email sent to ${supplier.email}`);

                    // Update email log with success
                    if (emailLog) {
                        await emailLog.update({
                            status: 'sent',
                            htmlContent,
                            gmailMessageId: info.messageId,
                            sentAt: new Date()
                        });
                    }
                } else {
                    console.warn(`⚠️ Supplier email not found for supplier ID ${supplierId}`);
                }
            } catch (emailErr) {
                console.error('❌ Failed to send supplier return email:', emailErr.message);
            }
        })();

        // 🔟 Send response
        res.status(201).json({
            success: true,
            message: "Supplier return saved, stock updated & payment created successfully. Email notification sent to supplier.",
            data: {
                supplierReturn,
                payment,
                stockBalance: {
                    previous: currentBalance,
                    returned: quantity,
                    current: newBalance
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

exports.getAllSupplierReturns = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            supplierId,
            productId,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        const branchId = req.currentBranchId || req.query.branchId || null;

        // Build where clause
        const where = {};
        if (branchId) where.branchId = branchId;
        if (supplierId) where.supplierId = supplierId;
        if (productId) where.productId = productId;

        if (startDate || endDate) {
            where.returnDate = {};
            if (startDate) where.returnDate[Op.gte] = new Date(startDate);
            if (endDate) where.returnDate[Op.lte] = new Date(endDate);
        }

        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Fetch supplier returns with associations
        const { count, rows: supplierReturns } = await SupplierReturn.findAndCountAll({
            where,
            include: [
                {
                    model: Suppliers,
                    as: 'supplier',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'productCode', 'costPrice']
                }
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        res.status(200).json({
            success: true,
            data: supplierReturns,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        next(error);
    }
};
