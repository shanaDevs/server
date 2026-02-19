
const nodemailer = require('nodemailer');
const db = require('../../models');
const { Product, Inventory, Suppliers, PurchaseOrder, PurchaseOrderItem } = db;
const { Op } = require('sequelize');

class AutoPOService {
    
    /**
     * Checks for low stock products and creates POs if necessary.
     * @param {Array} saleItems - Array of sale items containing productId
     * @param {number} branchId - The branch ID where sale occurred
     */
    async processAutoPO(saleItems, branchId = null) {
        try {
            console.log(`Starting Auto PO check for branch ${branchId}...`);
            
            // 1. Identify Low Stock Products
            // Unique product IDs from the sale
            const productIds = [...new Set(saleItems.map(item => item.productId))];
            
            const lowStockProducts = [];

            for (const productId of productIds) {
                const product = await Product.findByPk(productId);
                
                // Skip if product doesn't exist, has no minStockLevel configured, or no supplier
                if (!product || product.minStockLevel === null || product.minStockLevel === undefined || !product.supplierId) {
                    continue;
                }

                // Check Inventory for this product (optionally filtered by branch)
                const inventoryWhere = { 
                    productId: productId,
                    quantity: { [Op.gt]: 0 } // Only sum positive quantities (active batches)
                };
                
                // If we want to check branch-specific stock:
                if (branchId) {
                    inventoryWhere.branchId = branchId;
                }

                const inventorySum = await Inventory.sum('quantity', {
                    where: inventoryWhere
                }) || 0;

                console.log(`Product ${product.name} (ID: ${product.id}): Current Stock = ${inventorySum}, Min Level = ${product.minStockLevel}`);

                if (inventorySum <= product.minStockLevel) {
                    lowStockProducts.push({
                        product,
                        currentStock: inventorySum
                    });
                }
            }

            if (lowStockProducts.length === 0) {
                console.log('No products below minimum stock level.');
                return;
            }

            // 2. Group by Supplier
            const productsBySupplier = {};
            for (const item of lowStockProducts) {
                const supplierId = item.product.supplierId;
                if (!productsBySupplier[supplierId]) {
                    productsBySupplier[supplierId] = [];
                }
                productsBySupplier[supplierId].push(item);
            }

            // 3. Create POs and Send Emails
            for (const supplierId of Object.keys(productsBySupplier)) {
                await this.createPOForSupplier(supplierId, productsBySupplier[supplierId], branchId);
            }

        } catch (error) {
            console.error('Error in processAutoPO:', error);
            // We catch error so we don't disrupt the flow of the caller
        }
    }

    async createPOForSupplier(supplierId, itemsToOrder, branchId) {
         // Create Transaction for PO creation
         const transaction = await db.sequelize.transaction();
         
         try {
             const supplier = await Suppliers.findByPk(supplierId);
             if (!supplier) {
                 console.warn(`Supplier with ID ${supplierId} not found.`);
                 await transaction.rollback();
                 return;
             }

             console.log(`Creating PO for Supplier: ${supplier.name}`);

             // Create PO
             const po = await PurchaseOrder.create({
                 supplierId: supplier.id,
                 poDate: new Date(),
                 status: 'draft', // Initially draft as requested
                 notes: 'Auto-generated PO due to low stock',
                 branchId: branchId
             }, { transaction });

             let emailBodyRows = '';

             for (const item of itemsToOrder) {
                 // Determine Order Quantity
                 // Logic: Fill up to minStockLevel + buffer, or just minStockLevel * 2
                 // Default to 50 if minStockLevel is low
                 // Let's use: target = minStockLevel * 3. 
                 // So quantity = target - currentStock.
                 const targetLevel = (item.product.minStockLevel > 0 ? item.product.minStockLevel : 10) * 3; 
                 // Ensure at least some minimum order quantity, e.g., 10
                 const quantityNeeded = Math.max(10, targetLevel - item.currentStock);
                 
                 await PurchaseOrderItem.create({
                     poId: po.id,
                     productId: item.product.id,
                     quantityOrdered: quantityNeeded,
                     branchId: branchId
                 }, { transaction });

                 emailBodyRows += `
                     <tr>
                         <td style="padding: 8px; border: 1px solid #ddd;">${item.product.name}</td>
                         <td style="padding: 8px; border: 1px solid #ddd;">${item.product.productCode || 'N/A'}</td>
                         <td style="padding: 8px; border: 1px solid #ddd;">${item.currentStock}</td>
                         <td style="padding: 8px; border: 1px solid #ddd;">${quantityNeeded}</td>
                     </tr>
                 `;
             }


             await transaction.commit();
             console.log(`PO ${po.poNumber} created in 'draft' status.`);

             // We only create the draft and do NOT send email yet.


         } catch (err) {
             if (transaction) await transaction.rollback();
             console.error(`Failed to create auto PO for supplier ${supplierId}`, err);
         }
    }

    async sendEmail(to, poNumber, supplierName, rowsHtml, options = {}) {
        const { supplierId, poId, branchId, createdBy } = options;
        const subject = `New Purchase Order - ${poNumber}`;
        
        // Create email log entry first (status: pending)
        let emailLog = null;
        try {
            emailLog = await db.EmailLog.create({
                emailType: 'po_sent',
                subject,
                recipientEmail: to,
                recipientName: supplierName,
                senderEmail: process.env.EMAIL_USER,
                status: 'pending',
                relatedEntityType: 'PurchaseOrder',
                relatedEntityId: poId,
                relatedEntityRef: poNumber,
                supplierId,
                branchId,
                createdBy
            });
        } catch (logErr) {
            console.warn('⚠️ Failed to create email log:', logErr.message);
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ Email credentials (EMAIL_USER, EMAIL_PASS) not found in env. Skipping email.');
            console.warn('⚠️ Please configure EMAIL_USER and EMAIL_PASS in your .env file to enable email notifications.');
            if (emailLog) {
                await emailLog.update({ status: 'failed', errorMessage: 'Email credentials not configured' });
            }
            return;
        }

        if (!to || !to.includes('@')) {
            console.warn(`⚠️ Invalid or missing supplier email address: ${to}. Skipping email.`);
            if (emailLog) {
                await emailLog.update({ status: 'failed', errorMessage: 'Invalid recipient email address' });
            }
            return;
        }

        console.log(`📧 Attempting to send PO email to: ${to}`);

        try {
            const transporter = nodemailer.createTransport({
                 service: 'gmail', 
                 auth: {
                     user: process.env.EMAIL_USER,
                     pass: process.env.EMAIL_PASS
                 }
            });

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Purchase Order: ${poNumber}</h2>
                    <p>Dear ${supplierName},</p>
                    <p>Please find the below order details for immediate processing.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Product</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Code</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Current Stock</th>
                                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Quantity Ordered</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    
                    <p style="margin-top: 20px;">Thank you,</p>
                    <p><strong>POS System Auto-Order</strong></p>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: to,
                subject,
                html: htmlContent
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully to ${to}`);
            console.log(`📧 Message ID: ${info.messageId}`);

            // Update email log with success
            if (emailLog) {
                await emailLog.update({
                    status: 'sent',
                    htmlContent,
                    gmailMessageId: info.messageId,
                    sentAt: new Date()
                });
            }
        } catch (emailErr) {
            console.error('❌ Failed to send email:', emailErr.message);
            console.error('Full error:', emailErr);
            
            // Update email log with failure
            if (emailLog) {
                await emailLog.update({
                    status: 'failed',
                    errorMessage: emailErr.message
                });
            }
            
            throw emailErr;
        }
    }

    /**
     * Sends a cancellation email to the supplier when a PO is cancelled.
     * @param {string} to - Supplier email address
     * @param {string} poNumber - The PO number being cancelled
     * @param {string} supplierName - Name of the supplier
     * @param {string} cancelReason - Reason for cancellation (optional)
     * @param {string} rowsHtml - HTML table rows for PO items
     * @param {Object} options - Additional options (supplierId, poId, branchId, createdBy)
     */
    async sendCancelEmail(to, poNumber, supplierName, cancelReason = '', rowsHtml = '', options = {}) {
        const { supplierId, poId, branchId, createdBy } = options;
        const subject = `❌ Purchase Order Cancelled - ${poNumber}`;
        
        // Create email log entry first (status: pending)
        let emailLog = null;
        try {
            emailLog = await db.EmailLog.create({
                emailType: 'po_cancelled',
                subject,
                recipientEmail: to,
                recipientName: supplierName,
                senderEmail: process.env.EMAIL_USER,
                status: 'pending',
                relatedEntityType: 'PurchaseOrder',
                relatedEntityId: poId,
                relatedEntityRef: poNumber,
                supplierId,
                branchId,
                createdBy
            });
        } catch (logErr) {
            console.warn('⚠️ Failed to create email log:', logErr.message);
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ Email credentials (EMAIL_USER, EMAIL_PASS) not found in env. Skipping cancellation email.');
            console.warn('⚠️ Please configure EMAIL_USER and EMAIL_PASS in your .env file to enable email notifications.');
            if (emailLog) {
                await emailLog.update({ status: 'failed', errorMessage: 'Email credentials not configured' });
            }
            return;
        }

        if (!to || !to.includes('@')) {
            console.warn(`⚠️ Invalid or missing supplier email address: ${to}. Skipping cancellation email.`);
            if (emailLog) {
                await emailLog.update({ status: 'failed', errorMessage: 'Invalid recipient email address' });
            }
            return;
        }

        console.log(`📧 Attempting to send PO cancellation email to: ${to}`);

        try {
            const transporter = nodemailer.createTransport({
                 service: 'gmail', 
                 auth: {
                     user: process.env.EMAIL_USER,
                     pass: process.env.EMAIL_PASS
                 }
            });

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <div style="background-color: #dc3545; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
                        <h2 style="margin: 0;">⚠️ Purchase Order Cancelled: ${poNumber}</h2>
                    </div>
                    
                    <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
                        <p>Dear ${supplierName},</p>
                        <p>We regret to inform you that the following purchase order has been <strong style="color: #dc3545;">cancelled</strong>.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <p style="margin: 0;"><strong>PO Number:</strong> ${poNumber}</p>
                            ${cancelReason ? `<p style="margin: 10px 0 0 0;"><strong>Reason for Cancellation:</strong> ${cancelReason}</p>` : ''}
                        </div>
                        
                        ${rowsHtml ? `
                        <h3 style="color: #333; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">Cancelled Order Items</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <thead>
                                <tr style="background-color: #f2f2f2;">
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Code</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Quantity Ordered</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                        ` : ''}
                        
                        <p style="margin-top: 20px;">Please disregard any previous communication regarding this order. We apologize for any inconvenience caused.</p>
                        
                        <p style="margin-top: 20px;">If you have any questions, please do not hesitate to contact us.</p>
                        
                        <p style="margin-top: 20px;">Thank you for your understanding,</p>
                        <p><strong>POS System</strong></p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px;">
                        This is an automated message. Please do not reply directly to this email.
                    </div>
                </div>
            `;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: to,
                subject,
                html: htmlContent
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Cancellation email sent successfully to ${to}`);
            console.log(`📧 Message ID: ${info.messageId}`);

            // Update email log with success
            if (emailLog) {
                await emailLog.update({
                    status: 'sent',
                    htmlContent,
                    gmailMessageId: info.messageId,
                    sentAt: new Date()
                });
            }
        } catch (emailErr) {
            console.error('❌ Failed to send cancellation email:', emailErr.message);
            console.error('Full error:', emailErr);
            
            // Update email log with failure
            if (emailLog) {
                await emailLog.update({
                    status: 'failed',
                    errorMessage: emailErr.message
                });
            }
            
            throw emailErr;
        }
    }
}

module.exports = new AutoPOService();
