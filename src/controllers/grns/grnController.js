const db = require('../../models');
const { GRN, GRNItem, PurchaseOrder, Suppliers, Product, User, Inventory, InventoryLedger, ProductAuditLog, SupplierCredit, SupplierPayment } = db;
const grnService = require('../../services/grns/grnService');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { generateGRN } = require('../../utils/pdfGenerator');
const emailService = require('../../services/emails/emailService');
const { requireBranchId, addBranchFilter, addBranchId, getBranchConfig } = require('../../utils/branchHelper');
const fs = require('fs');
const path = require('path');

// Get all GRNs
exports.getAllGRNs = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search, status, supplierId, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;
        const branchConfig = getBranchConfig(req);

        const filters = { search, status, supplierId, startDate, endDate };
        const pagination = { limit: parseInt(limit), offset: parseInt(offset) };

        const { rows, count } = await grnService.getAllGRNs(filters, pagination, branchConfig);

        res.json({
            success: true,
            data: rows,
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

// Get GRN by ID
exports.getGRNById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchConfig = getBranchConfig(req);

        const grn = await grnService.getGRNById(id, branchConfig);

        if (!grn) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        res.json({ success: true, data: grn });
    } catch (error) {
        next(error);
    }
};

// Create GRN
exports.createGRN = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { supplierId, poId, invoiceNumber, invoiceDate, receivedDate, inspectionNotes, items } = req.body;
        
        // Get branch ID
        let branchId;
        try {
            branchId = requireBranchId(req);
        } catch (err) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: err.message, error: 'BRANCH_REQUIRED' });
        }

        let totalQuantity = 0;
        let totalAmount = 0;

        items.forEach(item => {
            const qty = Number(item.quantityReceived || 0);
            const unitCost = Number(item.unitCost || 0);

            totalQuantity += qty;
            totalAmount += qty * unitCost;   // 👈 IMPORTANT
        });
        // Generate GRN Number
        const grnNumber = await grnService.generateGRNNumber(branchId);

        const grnData = { 
            grnNumber,
            supplierId, 
            poId: (poId && Number(poId) > 0) ? Number(poId) : null, 
            invoiceNumber,
            invoiceDate,
            grnDate: receivedDate || new Date(),
            inspectionNotes, 
            createdBy: req.user?.id,
            branchId,
            status: 'draft',
            totalQuantity,
            totalAmount
        };


        // Generate batch numbers for items
        const lastBatch = await GRNItem.findOne({
            where: { batchNumber: { [Op.like]: 'BCH-%' } },
            order: [['id', 'DESC']]
        });
        
        let batchCounter = 1;
        if (lastBatch && lastBatch.batchNumber) {
            const lastNum = parseInt(lastBatch.batchNumber.replace('BCH-', ''), 10);
            if (!isNaN(lastNum)) {
                batchCounter = lastNum + 1;
            }
        }

        // Process items with batch numbers
        const processedItems = items.map((item, index) => ({
            ...item,
            batchNumber: `BCH-${String(batchCounter + index).padStart(4, '0')}`,
            receivedQty: item.quantityReceived || item.receivedQty,
            poItemId: (item.poItemId && Number(item.poItemId) > 0) ? Number(item.poItemId) : null
        }));

        const grn = await grnService.createGRN(grnData, processedItems, transaction);
        
        await transaction.commit();
        res.status(201).json({ success: true, message: 'GRN created successfully', data: grn });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        next(error);
    }
};

// Update GRN
exports.updateGRN = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { supplierId, invoiceNumber, invoiceDate, receivedDate, inspectionNotes, status, items } = req.body;
        const branchConfig = getBranchConfig(req);

        // 🔒 Prevent status from being set to "approved" through update endpoint
        if (status === 'approved') {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot set status to "approved" through update. Use the approve endpoint instead.' 
            });
        }

        const updateData = { supplierId, invoiceNumber, invoiceDate, inspectionNotes, status };
        if (receivedDate) updateData.grnDate = receivedDate;

        const updatedGrn = await grnService.updateGRN(id, updateData, items, branchConfig, transaction);
        
        if (!updatedGrn) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        await transaction.commit();
        res.json({ success: true, message: 'GRN updated successfully', data: updatedGrn });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        if (error.message === 'Cannot update approved GRN') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Complete GRN (Add items to inventory)
exports.completeGRN = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const branchConfig = getBranchConfig(req);
        
        const userContext = {
            userId: req.user?.id,
            userName: req.user?.userName || req.user?.name,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        };

        const grn = await grnService.completeGRN(id, branchConfig, userContext, transaction);

        if (!grn) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        await transaction.commit();
        res.json({ 
            success: true, 
            message: 'GRN completed and inventory updated successfully', 
            data: grn 
        });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        if (error.message === 'GRN already completed') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// Delete GRN
exports.deleteGRN = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const branchConfig = getBranchConfig(req);

        const deleted = await grnService.deleteGRN(id, branchConfig, transaction);
        
        if (!deleted) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        await transaction.commit();
        res.json({ success: true, message: 'GRN deleted successfully' });
    } catch (error) {
        if (transaction && !transaction.finished) { await transaction.rollback(); }
        if (error.message === 'Cannot delete approved GRN') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};


exports.updateGRNStatus = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { status, paymentMethod, paymentAmount } = req.body;
        const branchConfig = getBranchConfig(req);

        if (status === 'approved') {

            // 🔹 1. Fetch GRN Items
            const grnItems = await GRNItem.findAll({
                where: { grnId: id },
                transaction
            });

            if (!grnItems || grnItems.length === 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No items found for this GRN'
                });
            }

            // 🔹 2. Validate prices
            const invalidItems = grnItems.filter(item =>
                !item.unitCost || item.unitCost <= 0 ||
                !item.sellingPrice || item.sellingPrice <= 0 ||
                !item.mrp || item.mrp <= 0 ||
                Number(item.sellingPrice) > Number(item.mrp)
            );

            if (invalidItems.length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Cannot approve GRN. Invalid pricing found.',
                    data: invalidItems
                });
            }

            // 🔹 3. Validate payment inputs
            if (!paymentMethod || paymentAmount === undefined) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Payment method and payment amount are required'
                });
            }

            // 🔹 4. User context
            const userContext = {
                userId: req.user?.id,
                userName: req.user?.userName || req.user?.name,
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            };

            // 🔹 5. Approve GRN with payment data
            const grn = await grnService.completeGRN(
                id,
                { paymentMethod, paymentAmount },
                branchConfig,
                userContext,
                transaction
            );

            if (!grn) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'GRN not found' });
            }

            await transaction.commit();

            // 🔹 6. Generate PDF, save to server, and send email
            try {
                const grnWithDetails = await grnService.getGRNById(id, branchConfig);
                
                // Calculate payment details correctly
                const totalAmount = Number(grnWithDetails.totalAmount || 0);
                const paidAmount = Number(paymentAmount || 0);
                let balanceAmount = 0;
                let paymentType = 'full';
                
                if (paidAmount > totalAmount) {
                    balanceAmount = paidAmount - totalAmount;
                    paymentType = 'debit';
                } else if (paidAmount < totalAmount) {
                    balanceAmount = totalAmount - paidAmount;
                    paymentType = 'credit';
                } else {
                    balanceAmount = 0;
                    paymentType = 'full';
                }
                
                const paymentDetails = {
                    paymentMethod: paymentMethod,
                    paidAmount: paidAmount,
                    balanceAmount: balanceAmount,
                    paymentType: paymentType
                };

                const pdfBuffer = await generateGRN(grnWithDetails, paymentDetails);

                // 🔹 7. Save PDF to public/pdfs folder
                const publicPdfsDir = path.join(__dirname, '../../../public/pdfs');
                if (!fs.existsSync(publicPdfsDir)) {
                    fs.mkdirSync(publicPdfsDir, { recursive: true });
                }
                
                // Remove "GRN-" prefix if grnNumber already starts with "GRN"
                const pdfFileName = grn.grnNumber.startsWith('GRN') 
                    ? `${grn.grnNumber}.pdf` 
                    : `GRN-${grn.grnNumber}.pdf`;
                const pdfFilePath = path.join(publicPdfsDir, pdfFileName);
                fs.writeFileSync(pdfFilePath, pdfBuffer);
                
                console.log(`✅ PDF saved: ${pdfFilePath}`);
                
                // 🔹 8. Generate PDF download link
                const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
                // Use grnNumber as-is for the link (no double GRN- prefix)
                const pdfLinkFileName = grn.grnNumber.startsWith('GRN') 
                    ? grn.grnNumber 
                    : `GRN-${grn.grnNumber}`;
                const pdfLink = `${baseUrl}/pdfs/${pdfLinkFileName}.pdf`;

                // 🔹 9. Send email to supplier (if email exists)
                let emailResult = { success: false, reason: 'not_attempted' };
                if (grnWithDetails.supplier?.email) {
                    emailResult = await emailService.sendGRNApprovalEmail(
                        grnWithDetails,
                        pdfBuffer,
                        {
                            supplierId: grnWithDetails.supplierId,
                            grnId: grnWithDetails.id,
                            branchId: grnWithDetails.branchId,
                            createdBy: userContext.userId
                        }
                    );
                    console.log(`📧 Email result:`, emailResult);
                } else {
                    console.warn(`⚠️ No supplier email found for GRN ${grn.grnNumber}. Skipping email.`);
                }

                return res.json({
                    success: true,
                    message: 'GRN approved successfully',
                    data: grn,
                    pdf: pdfBuffer.toString('base64'),
                    pdfFileName: pdfFileName,
                    pdfLink: pdfLink,
                    emailSent: emailResult.success,
                    emailRecipient: emailResult.recipient || null
                });
            } catch (pdfError) {
                console.error('PDF generation or email failed:', pdfError);
                // Still return success for GRN approval even if PDF/email fails
                return res.json({
                    success: true,
                    message: 'GRN approved successfully (PDF/Email processing failed)',
                    data: grn,
                    error: pdfError.message
                });
            }
        }

        // 🔹 Other status updates
        const updatedGrn = await grnService.updateGRN(
            id,
            { status },
            null,
            branchConfig,
            transaction
        );

        if (!updatedGrn) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        await transaction.commit();
        res.json({
            success: true,
            message: 'GRN status updated successfully',
            data: updatedGrn
        });

    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(error);
    }
};

// Generate GRN PDF
exports.generateGRNPDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { paperSize = 'A4' } = req.query;
        const branchConfig = getBranchConfig(req);

        const grn = await grnService.getGRNById(id, branchConfig);

        if (!grn) {
            return res.status(404).json({ success: false, message: 'GRN not found' });
        }

        const pdfBuffer = await generateGRN(grn, paperSize);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=GRN-${grn.grnNumber}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

// Update GRN Payment
exports.updateGRNPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { paidAmount } = req.body;
        const branchConfig = getBranchConfig(req);

        // Validate payment amount
        if (paidAmount === undefined || paidAmount === null) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Paid amount is required' 
            });
        }

        if (isNaN(paidAmount) || paidAmount < 0) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Paid amount must be a positive number' 
            });
        }

        // Get GRN with branch filter
        const whereClause = { id };
        if (branchConfig.isBranchSpecific && branchConfig.branchId) {
            whereClause.branchId = branchConfig.branchId;
        }

        const grn = await GRN.findOne({ 
            where: whereClause,
            transaction 
        });

        if (!grn) {
            await transaction.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'GRN not found' 
            });
        }

        // Update paid amount (payment fields will be auto-calculated by hooks)
        await grn.update({ paidAmount: parseFloat(paidAmount) }, { transaction });

        // Reload to get calculated fields
        await grn.reload({ transaction });

        await transaction.commit();

        res.json({ 
            success: true, 
            message: 'Payment updated successfully', 
            data: {
                id: grn.id,
                grnNumber: grn.grnNumber,
                totalAmount: grn.totalAmount,
                paidAmount: grn.paidAmount,
                balanceAmount: grn.balanceAmount,
                paymentStatus: grn.paymentStatus,
                paymentDetails: grn.getPaymentDetails()
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) { 
            await transaction.rollback(); 
        }
        next(error);
    }
};

// Add payment to existing GRN (incremental payment)
exports.addGRNPayment = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { id } = req.params;
        const { paymentAmount, paymentMethod = 'cash', referenceNumber, bankName, chequeNumber, chequeDate, notes } = req.body;
        const branchConfig = getBranchConfig(req);

        if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Valid payment amount is required' 
            });
        }

        const whereClause = { id };
        if (branchConfig.isBranchSpecific && branchConfig.branchId) {
            whereClause.branchId = branchConfig.branchId;
        }

        const grn = await GRN.findOne({ 
            where: whereClause,
            include: [{ model: Suppliers, as: 'supplier' }],
            transaction 
        });

        if (!grn) {
            await transaction.rollback();
            return res.status(404).json({ 
                success: false, 
                message: 'GRN not found' 
            });
        }

        // Check if GRN is already fully paid
        if (grn.paymentStatus === 'paid') {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'GRN is already fully paid',
                grnNumber: grn.grnNumber,
                paymentStatus: 'paid'
            });
        }

        const parsedPaymentAmount = parseFloat(paymentAmount);
        const previousPaidAmount = parseFloat(grn.paidAmount) || 0;
        const totalAmount = parseFloat(grn.totalAmount);
        
        // Use instance method to add payment and update GRN
        await grn.addPayment(parsedPaymentAmount);
        await grn.reload({ transaction });

        const newPaymentStatus = grn.paymentStatus;

        // Create SupplierPayment record
        await SupplierPayment.create({
            supplierId: grn.supplierId,
            grnId: grn.id,
            paymentDate: new Date(),
            amount: parsedPaymentAmount,
            paymentMethod,
            referenceNumber,
            bankName,
            chequeNumber,
            chequeDate: chequeDate ? new Date(chequeDate) : null,
            status: 'completed',
            notes: notes || `Payment for GRN ${grn.grnNumber}`,
            previousBalance: parseFloat(grn.balanceAmount) + parsedPaymentAmount,
            currentBalance: parseFloat(grn.balanceAmount),
            createdBy: req.user.id,
            branchId: grn.branchId
        }, { transaction });

        // Create SupplierCredit transaction record
        // Get current supplier credit balance
        const lastCreditRecord = await SupplierCredit.findOne({
            where: { supplierId: grn.supplierId },
            order: [['createdAt', 'DESC']],
            transaction
        });
        
        const previousCreditBalance = lastCreditRecord ? parseFloat(lastCreditRecord.balanceAmount) : 0;
        const newCreditBalance = Math.max(0, previousCreditBalance - parsedPaymentAmount);

        await SupplierCredit.create({
            supplierId: grn.supplierId,
            transactionType: 'payment_made',
            amount: -parsedPaymentAmount, // Negative because it reduces the amount owed
            balanceAmount: newCreditBalance,
            referenceType: 'payment',
            referenceId: grn.id,
            referenceNumber: grn.grnNumber,
            paymentMethod,
            paidDate: new Date(),
            status: newPaymentStatus === 'paid' ? 'paid' : 'partial',
            notes: `Payment for GRN ${grn.grnNumber}. ${notes || ''}`.trim(),
            performedBy: req.user.id,
            branchId: grn.branchId
        }, { transaction });

        await transaction.commit();

        res.json({ 
            success: true, 
            message: newPaymentStatus === 'paid' ? 'Payment completed - GRN fully paid' : 'Partial payment added successfully',
            data: {
                id: grn.id,
                grnNumber: grn.grnNumber,
                supplierId: grn.supplierId,
                supplierName: grn.supplier?.name,
                totalAmount: grn.totalAmount,
                paidAmount: grn.paidAmount,
                balanceAmount: grn.balanceAmount,
                paymentStatus: grn.paymentStatus,
                action: newPaymentStatus === 'paid' ? 'paid' : 'partial',
                isFullyPaid: newPaymentStatus === 'paid',
                paymentDetails: grn.getPaymentDetails()
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) { 
            await transaction.rollback(); 
        }
        next(error);
    }
};

// Get GRN Payment Details
exports.getGRNPaymentDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const branchConfig = getBranchConfig(req);

        const whereClause = { id };
        if (branchConfig.isBranchSpecific && branchConfig.branchId) {
            whereClause.branchId = branchConfig.branchId;
        }

        const grn = await GRN.findOne({ 
            where: whereClause,
            attributes: [
                'id', 'grnNumber', 'totalAmount', 
                'paidAmount', 'balanceAmount', 'paymentStatus'
            ]
        });

        if (!grn) {
            return res.status(404).json({ 
                success: false, 
                message: 'GRN not found' 
            });
        }

        res.json({ 
            success: true, 
            data: grn.getPaymentDetails()
        });
    } catch (error) {
        next(error);
    }
};

// Get GRN by GRN Number
exports.getGRNByNumber = async (req, res, next) => {
    try {
        const { grnNumber } = req.params;
        const branchConfig = getBranchConfig(req);

        if (!grnNumber) {
            return res.status(400).json({
                success: false,
                message: 'GRN number is required'
            });
        }

        const grn = await grnService.getGRNByNumber(grnNumber, branchConfig);

        if (!grn) {
            return res.status(404).json({
                success: false,
                message: 'GRN not found'
            });
        }

        res.json({
            success: true,
            data: grn
        });
    } catch (error) {
        next(error);
    }
};