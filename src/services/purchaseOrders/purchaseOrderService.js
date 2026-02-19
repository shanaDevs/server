const db = require('../../models');
const { PurchaseOrder, PurchaseOrderItem, Suppliers, Product, User , GRN } = db;
const { Op } = require('sequelize');
const grnService = require('../../services/grns/grnService');
const autoPOService = require('./autoPOService');

class PurchaseOrderService {
    async getAllPurchaseOrders(filters, pagination, branchConfig) {
        const { search, status, supplierId, startDate, endDate } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {};
        
        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        if (search) {
            where[Op.or] = [
                { poNumber: { [Op.like]: `%${search}%` } }
            ];
        }

        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;
        
        if (startDate || endDate) {
            where.poDate = {};
            if (startDate) where.poDate[Op.gte] = startDate;
            if (endDate) where.poDate[Op.lte] = endDate;
        }

        return await PurchaseOrder.findAndCountAll({
            where,
            include: [
                { model: Suppliers, as: 'supplier', attributes: ['id', 'name', 'supplierCode', 'phone', 'email'] },
                { model: User, as: 'creator', attributes: ['id', 'userName'] }
            ],
            limit,
            offset,
            order: [['poDate', 'DESC'], ['createdAt', 'DESC']]
        });
    }

    async getPurchaseOrderById(id, branchConfig) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        return await PurchaseOrder.findOne({
            where,
            include: [
                { model: Suppliers, as: 'supplier' },
                { model: User, as: 'creator', attributes: ['id', 'userName'] },
                {
                    model: PurchaseOrderItem,
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                }
            ]
        });
    }

    async generatePONumber(branchId) {
        const prefix = 'PO';
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        const lastPO = await PurchaseOrder.findOne({
            where: {
                poNumber: { [Op.like]: `${prefix}${year}${month}%` },
                branchId
            },
            order: [['poNumber', 'DESC']]
        });

        let sequence = 1;
        if (lastPO) {
            const lastSequence = parseInt(lastPO.poNumber.slice(-4));
            sequence = lastSequence + 1;
        }

        return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
    }

    async createPurchaseOrder(data, items, transaction) {
        // Create PO
        const po = await PurchaseOrder.create(data, { transaction });

        // Create PO Items
        const poItems = items.map(item => ({
            ...item,
            poId: po.id,
            branchId: data.branchId
        }));

        await PurchaseOrderItem.bulkCreate(poItems, { transaction });

        return po;
    }

    // Service method
async updatePurchaseOrder(id, data, items, branchConfig, transaction, userId) {
    const { branchId, branchAccess } = branchConfig;
    const where = { id };

    // Branch filter
    if (branchId) {
        where.branchId = branchId;
    } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
        where.branchId = branchAccess.branches;
    }

    const po = await PurchaseOrder.findOne({ where, transaction });
    if (!po) return null;

    if (po.status === 'completed' || po.status === 'cancelled') {
        throw new Error(`Cannot update ${po.status} purchase order`);
    }

    const previousStatus = po.status;

    // Update PO
    await po.update(data, { transaction });

    // Update PO items (only if provided)
    if (items && items.length > 0) {
        await PurchaseOrderItem.destroy({ where: { poId: po.id }, transaction });

        const poItems = items.map(item => ({
            ...item,
            poId: po.id,
            branchId: po.branchId
        }));

        await PurchaseOrderItem.bulkCreate(poItems, { transaction });
    }

    // 🔥 SEND EMAIL IF STATUS CHANGED TO 'SENT'
    if (previousStatus !== 'sent' && po.status === 'sent') {
        console.log(`📧 PO status changed to 'sent'. Preparing email for PO: ${po.poNumber}`);
        try {
            const supplier = await Suppliers.findByPk(po.supplierId, { transaction });
             // Fetch items with product details for email
             const poItemsForEmail = await PurchaseOrderItem.findAll({
                where: { poId: po.id },
                include: [{ model: Product, as: 'product' }],
                transaction
            });

            if (!supplier) {
                console.warn(`⚠️ Supplier not found for PO: ${po.poNumber}`);
            } else if (!supplier.email) {
                console.warn(`⚠️ Supplier ${supplier.name} has no email address configured. Cannot send PO email.`);
            } else if (supplier && supplier.email) {
                console.log(`📧 Sending PO email to supplier: ${supplier.name} (${supplier.email})`);
                let emailBodyRows = '';
                for (const item of poItemsForEmail) {
                     emailBodyRows += `
                     <tr>
                         <td style="padding: 8px; border: 1px solid #ddd;">${item.product ? item.product.name : 'Unknown Product'}</td>
                         <td style="padding: 8px; border: 1px solid #ddd;">${item.product ? item.product.productCode : 'N/A'}</td>
                         <td style="padding: 8px; border: 1px solid #ddd;">-</td> <!-- Current stock unknown here without query -->
                         <td style="padding: 8px; border: 1px solid #ddd;">${item.quantityOrdered}</td>
                     </tr>
                 `;
                }

                // Send email asynchronously - don't block the transaction
                // Email sending is done in background and won't fail the transaction
                setImmediate(async () => {
                    try {
                        await autoPOService.sendEmail(supplier.email, po.poNumber, supplier.name, emailBodyRows, {
                            supplierId: supplier.id,
                            poId: po.id,
                            branchId: po.branchId,
                            createdBy: userId
                        });
                        console.log(`✅ PO email sent successfully for ${po.poNumber}`);
                    } catch (emailError) {
                        console.error(`❌ Failed to send PO email for ${po.poNumber}:`, emailError.message);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error preparing PO email:', error);
        }
    }

    // 🔥 SEND CANCELLATION EMAIL IF STATUS CHANGED TO 'CANCELLED'
    if (previousStatus !== 'cancelled' && po.status === 'cancelled') {
        console.log(`📧 PO status changed to 'cancelled'. Preparing cancellation email for PO: ${po.poNumber}`);
        try {
            const supplier = await Suppliers.findByPk(po.supplierId, { transaction });
            // Fetch items with product details for email
            const poItemsForEmail = await PurchaseOrderItem.findAll({
                where: { poId: po.id },
                include: [{ model: Product, as: 'product' }],
                transaction
            });

            if (!supplier) {
                console.warn(`⚠️ Supplier not found for PO: ${po.poNumber}`);
            } else if (!supplier.email) {
                console.warn(`⚠️ Supplier ${supplier.name} has no email address configured. Cannot send cancellation email.`);
            } else if (supplier && supplier.email) {
                console.log(`📧 Sending cancellation email to supplier: ${supplier.name} (${supplier.email})`);
                let emailBodyRows = '';
                for (const item of poItemsForEmail) {
                    emailBodyRows += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.product ? item.product.name : 'Unknown Product'}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.product ? item.product.productCode : 'N/A'}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.quantityOrdered}</td>
                        </tr>
                    `;
                }

                // Send email asynchronously - don't block the transaction
                const cancelReason = data.cancelReason || po.cancelReason || '';
                setImmediate(async () => {
                    try {
                        await autoPOService.sendCancelEmail(supplier.email, po.poNumber, supplier.name, cancelReason, emailBodyRows, {
                            supplierId: supplier.id,
                            poId: po.id,
                            branchId: po.branchId,
                            createdBy: userId
                        });
                        console.log(`✅ Cancellation email sent successfully for ${po.poNumber}`);
                    } catch (emailError) {
                        console.error(`❌ Failed to send cancellation email for ${po.poNumber}:`, emailError.message);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error preparing cancellation email:', error);
        }
    }

    // 🔥 AUTO CREATE GRN WHEN COMPLETED
    if (previousStatus !== 'completed' && po.status === 'completed') {

        // 1️⃣ Fetch PO items from DB
        const poItems = await PurchaseOrderItem.findAll({
            where: { poId: po.id },
            transaction
        });

        if (!poItems || poItems.length === 0) {
            throw new Error('Purchase order has no items to create GRN');
        }

        // 2️⃣ Convert PO items → GRN items
        const grnItems = await Promise.all(poItems.map(async (item) => {
            const product = await Product.findByPk(item.productId, { transaction });
            return {
                poItemId: item.id,
                productId: item.productId,
                quantityReceived: item.quantityOrdered, // Use quantityReceived as expected by GRNItem model
                receivedQty: item.quantityOrdered, // Keep receivedQty if grnService uses it internally/validation
                unitCost: item.unitCost || product.costPrice || 0,
                sellingPrice: item.sellingPrice || product.sellingPrice || 0,
                mrp: item.mrp || product.mrp || 0,
                expiryDate: item.expiryDate
            };
        }));

        console.log('GRN Items to be created:', grnItems);
        

        // 3️⃣ GRN master data
        const grnData = {
            branchId: po.branchId,
            supplierId: po.supplierId,
            poId: po.id,
            createdBy: userId,
            recevedBy: userId,
            companyId: po.companyId,
            status: 'draft',
            grnDate: new Date(),
            notes: po.notes,
            totalQuantity: po.totalQuantity, // <-- PO table eken direct gannawa
            totalAmount: po.totalAmount      // <-- PO table eken direct gannawa
        };
        // 4️⃣ Create GRN
        await grnService.createGRN(grnData, grnItems, transaction);
    }

    return po;
}



    async deletePurchaseOrder(id, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const po = await PurchaseOrder.findOne({ where, transaction });
        if (!po) return null;

        if (po.status === 'completed') {
            throw new Error('Cannot delete completed purchase order');
        }

        // Delete PO items
        await PurchaseOrderItem.destroy({ where: { poId: id }, transaction });

        // Delete PO
        await po.destroy({ transaction });
        return true;
    }

    async approvePurchaseOrder(id, branchConfig, userContext, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const po = await PurchaseOrder.findOne({ where, transaction });
        if (!po) return null;

        if (po.status !== 'pending') {
            throw new Error('Only pending purchase orders can be approved');
        }

        await po.update({
            status: 'approved',
            approvedBy: userContext.userId,
            approvedDate: new Date()
        }, { transaction });

        return po;
    }

    async cancelPurchaseOrder(id, reason, branchConfig, transaction) {
        const { branchId, branchAccess } = branchConfig;
        const where = { id };

        // Apply branch filter
        if (branchId) {
            where.branchId = branchId;
        } else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        const po = await PurchaseOrder.findOne({ where, transaction });
        if (!po) return null;

        if (po.status === 'completed') {
            throw new Error('Cannot cancel completed purchase order');
        }

        await po.update({
            status: 'cancelled',
            cancelReason: reason
        }, { transaction });

        // 🔥 SEND CANCELLATION EMAIL TO SUPPLIER
        console.log(`📧 PO cancelled. Preparing cancellation email for PO: ${po.poNumber}`);
        try {
            const supplier = await Suppliers.findByPk(po.supplierId, { transaction });
            // Fetch items with product details for email
            const poItemsForEmail = await PurchaseOrderItem.findAll({
                where: { poId: po.id },
                include: [{ model: Product, as: 'product' }],
                transaction
            });

            if (!supplier) {
                console.warn(`⚠️ Supplier not found for PO: ${po.poNumber}`);
            } else if (!supplier.email) {
                console.warn(`⚠️ Supplier ${supplier.name} has no email address configured. Cannot send cancellation email.`);
            } else if (supplier && supplier.email) {
                console.log(`📧 Sending cancellation email to supplier: ${supplier.name} (${supplier.email})`);
                let emailBodyRows = '';
                for (const item of poItemsForEmail) {
                    emailBodyRows += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.product ? item.product.name : 'Unknown Product'}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.product ? item.product.productCode : 'N/A'}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.quantityOrdered}</td>
                        </tr>
                    `;
                }

                // Send email asynchronously - don't block the transaction
                setImmediate(async () => {
                    try {
                        await autoPOService.sendCancelEmail(supplier.email, po.poNumber, supplier.name, reason || '', emailBodyRows, {
                            supplierId: supplier.id,
                            poId: po.id,
                            branchId: po.branchId
                        });
                        console.log(`✅ Cancellation email sent successfully for ${po.poNumber}`);
                    } catch (emailError) {
                        console.error(`❌ Failed to send cancellation email for ${po.poNumber}:`, emailError.message);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error preparing cancellation email:', error);
        }

        return po;
    }
}

module.exports = new PurchaseOrderService();

