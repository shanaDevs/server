const db = require('../../models');
const { Sale, SaleItem, SalePayment, SaleReturnItem, Customer, CustomerLoyalty, CustomerCredit, CustomerPurchaseHistory, Product, Inventory, InventoryLedger, User, ProductAuditLog, CustomerDiscount, SystemSettings } = db;
const { Op } = require('sequelize');
const { generateSalesReceipt } = require('../../utils/pdfGenerator');
const promotionService = require('../promotion/promotionService'); // Import Added

/**
 * Service class for managing sales operations including creation, retrieval, updates, and cancellations.
 * Handles inventory deductions, payment processing, customer credit management, promotions, and simultaneous returns.
 */
class SaleService {
    /**
     * Creates a new sale with items, optional payments, and optional simultaneous returns.
     * Processes inventory deductions, applies discounts and promotions, and manages customer credit.
     * 
     * @param {Object} data - Sale creation data
     * @param {number|string} [data.customerId] - Customer ID (null for walk-in customers, use 0 or -1 for anonymous)
     * @param {Array<Object>} data.items - Array of sale items (required, min 1)
     * @param {number} data.items[].productId - Product ID
     * @param {number} data.items[].quantity - Quantity to sell
     * @param {number} data.items[].unitPrice - Unit price
     * @param {string} [data.items[].unit] - Unit of measure
     * @param {number} [data.items[].discountPercentage] - Item-level discount percentage
     * @param {number} [data.items[].discountAmount] - Item-level discount amount
     * @param {string} [data.items[].notes] - Item notes
     * @param {number} [data.items[].promotionId] - Item-level promotion ID
     * @param {Array<Object>} [data.returnItems=[]] - Array of return items to process in same transaction
     * @param {number} data.returnItems[].productId - Product ID to return
     * @param {number} data.returnItems[].quantity - Quantity to return
     * @param {number} [data.returnItems[].unitPrice] - Unit price (defaults to product selling price)
     * @param {number} [data.returnItems[].discountAmount] - Return item discount amount
     * @param {number} [data.returnItems[].discountPercentage] - Return item discount percentage
     * @param {string} [data.returnItems[].returnReason] - Reason for return
     * @param {string} [data.returnItems[].condition='good'] - Item condition: 'good'|'damaged'|'defective'|'expired'
     * @param {Array<Object>} [data.payments=[]] - Array of payment records
     * @param {string} data.payments[].paymentMethod - Payment method: 'cash'|'card'|'bank_transfer'|'mobile_money'|'cheque'|'loyalty_points'|'credit'|'other'
     * @param {number} data.payments[].amount - Payment amount
     * @param {string} [data.payments[].referenceNumber] - Payment reference number
     * @param {string} [data.payments[].cardType] - Card type for card payments
     * @param {string} [data.payments[].cardLastFour] - Last 4 digits of card
     * @param {string} [data.payments[].bankName] - Bank name for bank transfers
     * @param {string} [data.payments[].notes] - Payment notes
     * @param {number} [data.discountPercentage=0] - Sale-level discount percentage
     * @param {number} [data.discountAmount=0] - Sale-level discount amount
     * @param {number} [data.taxPercentage=0] - Tax percentage to apply
     * @param {number} [data.loyaltyPointsRedeemed=0] - Loyalty points to redeem
     * @param {string} [data.notes] - Internal sale notes
     * @param {string} [data.customerNotes] - Customer-facing notes
     * @param {string} [data.saleType='retail'] - Sale type: 'retail'|'wholesale'|'online'|'phone_order'
     * @param {number} [data.branchId] - Branch ID
     * @param {Object} data.user - User object with id property (required)
     * @param {string} [data.ipAddress] - Request IP address for audit
     * @param {string} [data.userAgent] - Request user agent for audit
     * @param {string} [data.saleStatus] - Override sale status: 'draft'|'completed'|'cancelled'|'returned'
     * @param {string} [data.paymentStatus] - Override payment status: 'pending'|'partial'|'paid'|'refunded'|'cancelled'
     * @param {number} [data.promotionId] - Promotion ID to apply
     * @param {string} [data.promoCode] - Promo/coupon code
     * @param {number} [data.counterSessionId] - Counter session ID for POS tracking
     * @param {Object} transaction - Sequelize transaction object
     * @returns {Promise<Object>} The created Sale object with all associations
     * @throws {Error} If items array is empty
     * @throws {Error} If customer not found (when customerId provided)
     * @throws {Error} If product not found
     * @throws {Error} If insufficient stock for any item
     */
    async createSale(data, transaction) {
        const {
            customerId: rawCustomerId,
            items,
            returnItems = [], // Return items to process in same transaction
            payments = [],
            discountPercentage = 0,
            discountAmount = 0,
            taxPercentage = 0, // Manual tax percentage override from POS
            taxAmount: manualTaxAmount, // Manual tax amount override from POS
            enableTax: taxOverride, // Optional override: true/false/null to override system setting
            loyaltyPointsRedeemed = 0,
            notes,
            customerNotes,
            saleType = 'retail',
            branchId,
            user,
            ipAddress,
            userAgent,
            saleStatus,
            paymentStatus: providedPaymentStatus,
            promotionId: rawPromotionId,
            promoCode,
            counterSessionId
        } = data;

        // Fetch system settings
        const settings = await SystemSettings.findOne({ transaction });
        const isLoyaltyEnabled = settings ? settings.enableLoyalty : true;

        // Determine if tax is enabled (POS override > system setting)
        const isTaxEnabled = taxOverride !== undefined && taxOverride !== null
            ? taxOverride
            : (settings ? settings.enableTax : false);

        // System tax configuration
        const systemTaxRate = settings ? parseFloat(settings.taxRate || 0) : 0;
        const systemTaxType = settings ? settings.taxType : 'percentage';
        const systemTaxName = settings ? settings.taxName : 'VAT';

        if ((!items || items.length === 0) && (!returnItems || returnItems.length === 0)) {
            throw new Error('Sale must contain at least one item or return item');
        }

        const itemsToProcess = items || [];

        const customerId =
            !rawCustomerId || ['0', 0, -1, '-1'].includes(rawCustomerId)
                ? null
                : rawCustomerId;

        const promotionId =
            !rawPromotionId || ['0', 0, -1, '-1'].includes(rawPromotionId)
                ? null
                : rawPromotionId;

        if (customerId) {
            const customer = await Customer.findByPk(customerId, { transaction });
            if (!customer) throw new Error(`Customer ${customerId} not found`);
        }


        // 1. Process items -> Calculate Item Subtotals & Item Discounts -> Deduct Inventory
        let totalGrossSubtotal = 0; // Sum of (Qty * UnitPrice)
        let totalItemLevelDiscount = 0; // Sum of (Item Specific Discounts)
        let totalItemCost = 0;

        // We will store processed items here to use for creation later
        const processedItems = [];

        // Fetch all customer discounts for this customer if exists
        let customerDiscounts = [];
        if (customerId) {
            customerDiscounts = await CustomerDiscount.findAll({
                where: { customerId },
                attributes: ['productId', 'discountPercentage', 'discountAmount'],
                transaction
            });
        }

        for (const item of itemsToProcess) {
            if (!item.quantity || item.quantity <= 0) {
                throw new Error('Invalid quantity');
            }

            const unitPrice = Number(item.unitPrice || 0);
            const quantity = Number(item.quantity);

            const product = await Product.findByPk(item.productId, { transaction });
            if (!product) throw new Error(`Product ${item.productId} not found`);

            const itemOps = {
                grossAmount: quantity * unitPrice,
                discountAmount: 0,
                discountPercentage: 0,
                netAmount: 0,
                cost: 0
            };

            // Inventory Logic
            const inventoryWhere = {
                productId: product.id,
                quantity: { [Op.gt]: 0 },
                ...(branchId && { branchId })
            };

            const batches = await Inventory.findAll({
                where: inventoryWhere,
                order: [
                    [db.sequelize.literal('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END'), 'ASC'],
                    ['expiryDate', 'ASC'],
                    ['createdAt', 'ASC']
                ],
                transaction
            });

            const availableQty = batches.reduce((s, b) => s + Number(b.quantity), 0);
            if (availableQty < quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }

            let remainingQty = quantity;
            let itemCost = 0;

            for (const batch of batches) {
                if (remainingQty <= 0) break;

                const deductQty = Math.min(remainingQty, Number(batch.quantity));
                const cost = deductQty * Number(batch.unitCost || 0);

                itemCost += cost;

                await Inventory.create({
                    productId: product.id,
                    grnId: batch.grnId,
                    referenceType: 'sale',
                    batchNumber: batch.batchNumber,
                    expiryDate: batch.expiryDate,
                    branchId,
                    quantity: -deductQty,
                    unitCost: batch.unitCost,
                    sellingPrice: batch.sellingPrice,
                    mrp: batch.mrp,
                    performedBy: user.id,
                    remarks: 'Sale deduction'
                }, { transaction });

                remainingQty -= deductQty;
            }

            itemOps.cost = itemCost;
            totalItemCost += itemCost;

            // Calculate Item-Specific Discount
            // Priority: 1) Manual item discount, 2) Customer discount for this product, 3) No discount
            if (item.discountAmount > 0 || item.discountPercentage > 0) {
                // Manual discount provided in the sale item
                if (item.discountAmount > 0) {
                    itemOps.discountAmount = Number(item.discountAmount);
                    if (itemOps.grossAmount > 0) {
                        itemOps.discountPercentage = (itemOps.discountAmount / itemOps.grossAmount) * 100;
                    }
                } else if (item.discountPercentage > 0) {
                    itemOps.discountPercentage = Number(item.discountPercentage);
                    itemOps.discountAmount = (itemOps.grossAmount * itemOps.discountPercentage) / 100;
                }
            } else {
                // Check if customer has a discount for this product
                const customerDiscount = customerDiscounts.find(cd => cd.productId === item.productId);
                if (customerDiscount) {
                    // Apply customer discount - prioritize percentage over amount
                    if (customerDiscount.discountPercentage && customerDiscount.discountPercentage > 0) {
                        // Percentage discount takes priority
                        itemOps.discountPercentage = Number(customerDiscount.discountPercentage);
                        itemOps.discountAmount = (itemOps.grossAmount * itemOps.discountPercentage) / 100;
                    } else if (customerDiscount.discountAmount && customerDiscount.discountAmount > 0) {
                        // Fixed discount amount per item (only if percentage is 0 or null)
                        itemOps.discountAmount = Number(customerDiscount.discountAmount) * quantity;
                        if (itemOps.grossAmount > 0) {
                            itemOps.discountPercentage = (itemOps.discountAmount / itemOps.grossAmount) * 100;
                        }
                    }
                }
            }
            // ...
            // ... (Logic continues until Sale creation)
            // ...
            itemOps.netAmount = Math.max(0, itemOps.grossAmount - itemOps.discountAmount);

            // Calculate per-item tax if tax is enabled
            let itemTax = { amount: 0, percentage: 0, type: 'none' };

            if (isTaxEnabled) {
                // Check if product is taxable (default is true)
                const productIsTaxable = product.isTaxable !== false;

                if (productIsTaxable) {
                    // Determine tax rate and type for this item
                    // Priority: 1) Manual item override, 2) Product-specific, 3) System default

                    if (item.taxPercentage !== undefined && item.taxPercentage !== null && item.taxPercentage > 0) {
                        // 1. Manual item override (Percentage)
                        itemTax.percentage = parseFloat(item.taxPercentage);
                        itemTax.amount = (itemOps.netAmount * itemTax.percentage) / 100;
                        itemTax.type = 'percentage';
                    } else if (item.taxAmount !== undefined && item.taxAmount !== null && item.taxAmount > 0) {
                        // 1. Manual item override (Fixed Amount)
                        itemTax.amount = parseFloat(item.taxAmount);
                        itemTax.percentage = itemOps.netAmount > 0 ? (itemTax.amount / itemOps.netAmount) * 100 : 0;
                        itemTax.type = 'fixed';
                    } else if (!product.taxRate || product.taxType === 'system_default') {
                        // 3. Use system settings
                        if (systemTaxType === 'percentage' && systemTaxRate > 0) {
                            itemTax.percentage = systemTaxRate;
                            itemTax.amount = (itemOps.netAmount * systemTaxRate) / 100;
                            itemTax.type = 'percentage';
                        } else if (systemTaxType === 'fixed' && systemTaxRate > 0) {
                            // Fixed tax amount per item unit
                            itemTax.amount = systemTaxRate * quantity;
                            itemTax.percentage = itemOps.netAmount > 0 ? (itemTax.amount / itemOps.netAmount) * 100 : 0;
                            itemTax.type = 'fixed';
                        }
                    } else {
                        // 2. Use product-specific tax
                        const productTaxRate = parseFloat(product.taxRate || 0);
                        if (product.taxType === 'percentage' && productTaxRate > 0) {
                            itemTax.percentage = productTaxRate;
                            itemTax.amount = (itemOps.netAmount * productTaxRate) / 100;
                            itemTax.type = 'percentage';
                        } else if (product.taxType === 'fixed' && productTaxRate > 0) {
                            itemTax.amount = productTaxRate * quantity;
                            itemTax.percentage = itemOps.netAmount > 0 ? (itemTax.amount / itemOps.netAmount) * 100 : 0;
                            itemTax.type = 'fixed';
                        }
                    }
                }
            }

            // Add to totals
            totalGrossSubtotal += itemOps.grossAmount;
            totalItemLevelDiscount += itemOps.discountAmount;

            processedItems.push({
                productId: product.id,
                productName: product.name || 'Unknown Product',
                productCode: product.productCode,
                quantity,
                unit: item.unit || product.unitOfMeasure || 'pcs',
                unitPrice,
                subtotal: itemOps.grossAmount,
                totalCost: itemCost,
                discountPercentage: Number(itemOps.discountPercentage.toFixed(2)),
                discountAmount: Number(itemOps.discountAmount.toFixed(2)),
                totalAmount: Number(itemOps.netAmount.toFixed(2)), // Net of item discount (before tax)
                // Tax fields
                taxPercentage: Number(itemTax.percentage.toFixed(2)),
                taxAmount: Number(itemTax.amount.toFixed(2)),
                taxType: itemTax.type,
                notes: item.notes || null,
                promotionId: item.promotionId || null
            });

            await ProductAuditLog.create({
                productId: product.id,
                action: 'stock_adjusted',
                oldValue: availableQty.toString(),
                newValue: (availableQty - quantity).toString(),
                changedBy: user.id,
                ipAddress,
                userAgent,
                branchId,
                notes: 'Sale deduction'
            }, { transaction });
        }

        // 2. Calculate Sale-Level Discount (Bill Discount)
        // Applied on the total AFTER item discounts (totalGrossSubtotal - totalItemLevelDiscount)
        const baseForSaleDiscount = Math.max(0, totalGrossSubtotal - totalItemLevelDiscount);

        let saleLevelDiscountAmount = 0;

        // Track detailed promo info to save later
        const appliedPromosToSave = [];

        if (baseForSaleDiscount > 0) {

            // Handle MULTIPLE promotions (if provided)
            // Expected format: data.promotions = [{ id: 1, ... }, { id: 2 }]; OR data.promotionIds = [1, 2];
            let promotionsToApply = [];

            if (data.promotions && Array.isArray(data.promotions)) {
                promotionsToApply = data.promotions.map(p => p.id || p);
            } else if (data.promotionIds && Array.isArray(data.promotionIds)) {
                promotionsToApply = data.promotionIds;
            } else if (promotionId) {
                // Backward compatibility for single promo
                promotionsToApply = [promotionId];
            }

            // Remove duplicates/nulls
            promotionsToApply = [...new Set(promotionsToApply)].filter(pid => pid);

            if (promotionsToApply.length > 0) {
                const promoItems = processedItems.map(pi => ({
                    productId: pi.productId,
                    productCode: pi.productCode,
                    quantity: pi.quantity,
                    price: pi.unitPrice
                }));

                for (const pid of promotionsToApply) {
                    try {
                        // Check remaining amount to apply discount on (prevent negative)
                        const currentDiscountedTotal = Math.max(0, baseForSaleDiscount - saleLevelDiscountAmount);
                        if (currentDiscountedTotal <= 0) break; // Stop if fully discounted

                        const promoResult = await promotionService.applyPromotion(
                            pid,
                            promoItems,
                            baseForSaleDiscount, // Note: We pass original base, but cap logic below handles total
                            customerId,
                            transaction
                        );

                        if (promoResult && promoResult.discount > 0) {
                            // Ensure this specific discount doesn't exceed what's left
                            const validDiscount = Math.min(Number(promoResult.discount), currentDiscountedTotal);

                            if (validDiscount > 0) {
                                saleLevelDiscountAmount += validDiscount;

                                appliedPromosToSave.push({
                                    promotionId: Number(pid),
                                    discountAmount: validDiscount,
                                    promoCode: promoResult.promotion ? promoResult.promotion.couponCode : null
                                });
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to apply promotion ${pid}:`, err.message);
                    }
                }
            }

            // If no promotions applied (or they failed), check manual overrides
            if (saleLevelDiscountAmount === 0) {
                if (discountAmount > 0) {
                    saleLevelDiscountAmount = Number(discountAmount);
                } else if (discountPercentage > 0) {
                    saleLevelDiscountAmount = (baseForSaleDiscount * Number(discountPercentage)) / 100;
                }
            }

            // Final Safety Cap
            saleLevelDiscountAmount = Math.min(saleLevelDiscountAmount, baseForSaleDiscount);
        }

        const saleLevelDiscountPercentage = baseForSaleDiscount > 0
            ? (saleLevelDiscountAmount / baseForSaleDiscount) * 100
            : 0;

        // 3. Final Calculations - Tax
        const taxableAmount = Math.max(0, baseForSaleDiscount - saleLevelDiscountAmount);

        // Calculate total tax - either from manual override (POS) or sum of item taxes
        let taxValue = 0;
        let finalTaxPercentage = 0;
        let finalTaxType = 'none';

        if (isTaxEnabled) {
            // Check for manual POS tax override first
            if (manualTaxAmount !== undefined && manualTaxAmount !== null && manualTaxAmount > 0) {
                // Manual fixed amount from POS
                taxValue = parseFloat(manualTaxAmount);
                finalTaxPercentage = taxableAmount > 0 ? (taxValue / taxableAmount) * 100 : 0;
                finalTaxType = 'fixed';
            } else if (taxPercentage > 0) {
                // Manual percentage from POS (this overrides per-item taxes)
                taxValue = (taxableAmount * taxPercentage) / 100;
                finalTaxPercentage = taxPercentage;
                finalTaxType = 'percentage';
            } else {
                // Use cumulative item-level taxes (already calculated)
                taxValue = processedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
                finalTaxPercentage = taxableAmount > 0 ? (taxValue / taxableAmount) * 100 : 0;

                // Determine if mixed tax types or single type
                const taxTypes = [...new Set(processedItems.filter(i => i.taxType !== 'none').map(i => i.taxType))];
                if (taxTypes.length === 0) {
                    finalTaxType = 'none';
                } else if (taxTypes.length === 1) {
                    finalTaxType = taxTypes[0];
                } else {
                    finalTaxType = 'mixed'; // Different products have different tax types
                }
            }
        }

        // Note: User requested that Sale table shows ONLY the Sale-Level discount
        // And implies Subtotal should be the "Net Item Total" (baseForSaleDiscount)

        const loyaltyPointValue = settings ? parseFloat(settings.loyaltyPointValue || 1) : 1;
        const loyaltyValue = isLoyaltyEnabled ? (loyaltyPointsRedeemed * loyaltyPointValue) : 0;
        const finalTotalAmount = Math.max(0, taxableAmount + taxValue - loyaltyValue);

        const finalProfit = finalTotalAmount - totalItemCost;

        const paidAmountValue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const finalCreditAmount = Math.max(0, finalTotalAmount - paidAmountValue);
        const finalChangeAmount = Math.max(0, paidAmountValue - finalTotalAmount);

        let computedPaymentStatus = 'pending';
        if (paidAmountValue >= finalTotalAmount && finalTotalAmount > 0) computedPaymentStatus = 'paid';
        else if (paidAmountValue > 0) computedPaymentStatus = 'partial';

        const finalSaleStatus = saleStatus || (paidAmountValue === 0 ? 'draft' : 'completed');
        const finalPaymentStatus = providedPaymentStatus || computedPaymentStatus;

        // 4. Create Sale Record
        const sale = await Sale.create({
            customerId,
            saleDate: new Date(),
            subtotal: Number(baseForSaleDiscount.toFixed(2)),
            discountAmount: Number(saleLevelDiscountAmount.toFixed(2)),
            discountPercentage: Number(saleLevelDiscountPercentage.toFixed(2)),
            taxAmount: Number(taxValue.toFixed(2)),
            taxPercentage: Number(finalTaxPercentage.toFixed(2)),
            taxType: finalTaxType,
            taxName: isTaxEnabled ? systemTaxName : null,
            totalAmount: Number(finalTotalAmount.toFixed(2)),
            totalCost: Number(totalItemCost.toFixed(2)),
            profit: Number(finalProfit.toFixed(2)),
            profitMargin: finalTotalAmount > 0 ? Math.max(-999.99, Math.min(999.99, Number(((finalProfit / finalTotalAmount) * 100).toFixed(2)))) : 0,
            paidAmount: paidAmountValue,
            creditAmount: Number(finalCreditAmount.toFixed(2)),
            changeAmount: Number(finalChangeAmount.toFixed(2)),
            loyaltyPointsEarned: (customerId && isLoyaltyEnabled) ? Math.floor(finalTotalAmount / (settings ? parseFloat(settings.loyaltyPointsPerAmount || 1) : 1)) : 0,
            loyaltyPointsRedeemed,
            loyaltyPointsValue: loyaltyValue,
            paymentStatus: finalPaymentStatus,
            saleStatus: finalSaleStatus,
            saleType,
            notes,
            customerNotes,
            cashierId: user.id,
            branchId,
            counterSessionId,
            promotionId,
            promoCode
        }, { transaction });

        // 4.5 Create SalePayment records for each payment
        if (payments && payments.length > 0) {
            for (const payment of payments) {
                await SalePayment.create({
                    saleId: sale.id,
                    amount: Number(payment.amount || 0),
                    paymentMethod: payment.paymentMethod || 'cash',
                    paymentDate: new Date(),
                    referenceNumber: payment.referenceNumber || null,
                    cardType: payment.cardType || null,
                    cardLastFour: payment.cardLastFour || null,
                    bankName: payment.bankName || null,
                    notes: payment.notes || null,
                    processedBy: user.id,
                    totalAmount: Number(finalTotalAmount.toFixed(2)),
                    paidAmount: paidAmountValue,
                    remainingAmount: Number(finalCreditAmount.toFixed(2)),
                    paymentStatus: finalPaymentStatus,
                    branchId: branchId
                }, { transaction });
            }
        }

        // 5. Create SaleItems 

        for (const item of processedItems) {
            let effectiveItemTotal = item.totalAmount;
            if (baseForSaleDiscount > 0 && saleLevelDiscountAmount > 0) {
                const ratio = item.totalAmount / baseForSaleDiscount;
                effectiveItemTotal -= (saleLevelDiscountAmount * ratio);
            }

            const itemProfit = effectiveItemTotal - item.totalCost;

            await SaleItem.create({
                saleId: sale.id,
                branchId,
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                discountPercentage: item.discountPercentage,
                discountAmount: item.discountAmount,
                totalAmount: item.totalAmount,
                // Tax fields
                taxPercentage: item.taxPercentage || 0,
                taxAmount: item.taxAmount || 0,
                taxType: item.taxType || 'none',
                profit: Number(itemProfit.toFixed(2)),
                profitMargin: effectiveItemTotal > 0 ? Math.max(-999.99, Math.min(999.99, Number(((itemProfit / effectiveItemTotal) * 100).toFixed(2)))) : 0,
                promotionId: item.promotionId
            }, { transaction });
        }

        // 6. Save Applied Promotions (Link Table)
        if (appliedPromosToSave.length > 0) {
            const promoRecords = appliedPromosToSave.map(p => ({
                saleId: sale.id,
                promotionId: p.promotionId,
                promoCode: p.promoCode,
                discountAmount: p.discountAmount.toFixed(2)
            }));

            // Import SalePromotion dynamically or ensure it is at top
            const { SalePromotion } = db;
            await SalePromotion.bulkCreate(promoRecords, { transaction });
        }

        // 7. Update Customer Credit - MOVED TO STEP 9 AFTER RETURNS PROCESSING


        // 8. Process Return Items (if any)
        let returnSubtotal = 0;
        let returnDiscountAmount = 0;
        let returnTaxAmountVal = 0;
        let returnTotalAmountVal = 0;

        if (returnItems && returnItems.length > 0) {
            for (const returnItem of returnItems) {
                const { productId, quantity, unitPrice, discountAmount: returnItemDiscount = 0, discountPercentage: returnItemDiscPercent = 0, returnReason, condition = 'good' } = returnItem;

                if (!productId || !quantity || quantity <= 0) {
                    throw new Error('Each return item must have productId and positive quantity');
                }

                // Find the product
                const product = await Product.findByPk(productId, { transaction });
                if (!product) {
                    throw new Error(`Product with ID ${productId} not found for return`);
                }

                // Determine unit price
                const itemUnitPrice = unitPrice || product.sellingPrice || 0;

                // Calculate return amounts
                const itemSubtotal = parseFloat(quantity) * parseFloat(itemUnitPrice);
                const itemDiscount = returnItemDiscount || (itemSubtotal * (returnItemDiscPercent / 100));
                const itemNet = itemSubtotal - itemDiscount;

                // Calculate tax for returned item
                let itemTaxPercentage = 0;
                let itemTaxAmount = 0;
                let itemTaxType = 'none';

                if (isTaxEnabled && product.isTaxable) {
                    const productTaxRate = parseFloat(product.taxRate || 0);
                    if (product.taxType === 'percentage' && productTaxRate > 0) {
                        itemTaxPercentage = productTaxRate;
                        itemTaxAmount = (itemNet * productTaxRate) / 100;
                        itemTaxType = 'percentage';
                    } else if (product.taxType === 'fixed' && productTaxRate > 0) {
                        itemTaxAmount = productTaxRate * quantity;
                        itemTaxPercentage = itemNet > 0 ? (itemTaxAmount / itemNet) * 100 : 0;
                        itemTaxType = 'fixed';
                    }
                }

                const itemTotal = itemNet + itemTaxAmount;

                returnSubtotal += itemSubtotal;
                returnDiscountAmount += itemDiscount;
                returnTaxAmountVal += itemTaxAmount;
                returnTotalAmountVal += itemTotal;

                // Create return item record
                await SaleReturnItem.create({
                    saleId: sale.id,
                    productId: productId,
                    productName: product.name,
                    quantity: quantity,
                    unitPrice: itemUnitPrice,
                    discountAmount: itemDiscount,
                    discountPercentage: returnItemDiscPercent,
                    taxPercentage: itemTaxPercentage,
                    taxAmount: itemTaxAmount,
                    taxType: itemTaxType,
                    totalAmount: itemNet,
                    returnReason: returnReason,
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
                        branchId: branchId,
                        quantity: quantity, // Positive for stock in
                        unitCost: latestBatch.unitCost,
                        sellingPrice: latestBatch.sellingPrice,
                        mrp: latestBatch.mrp,
                        performedBy: user.id,
                        remarks: `Return during sale ${sale.saleNumber}`
                    }, { transaction });
                } else {
                    await Inventory.create({
                        productId: productId,
                        referenceType: 'sale_return',
                        quantity: quantity,
                        branchId: branchId,
                        unitCost: product.costPrice || 0,
                        sellingPrice: itemUnitPrice,
                        performedBy: user.id,
                        remarks: `Return during sale ${sale.saleNumber} - New batch`
                    }, { transaction });
                }

                // Log to product audit
                await ProductAuditLog.create({
                    productId: productId,
                    action: 'stock_adjusted',
                    changedBy: user.id,
                    branchId: branchId,
                    notes: `Return during sale ${sale.saleNumber} - ${quantity} units restored`
                }, { transaction });
            }

            // Calculate net payable
            const netPayable = Math.max(0, parseFloat(sale.totalAmount) - returnTotalAmountVal);
            const paidAmount = parseFloat(sale.paidAmount);

            // Determine updated payment status based on net payable
            let updatedPaymentStatus = 'pending';
            if (paidAmount >= netPayable && netPayable > 0) updatedPaymentStatus = 'paid';
            else if (paidAmount > 0) updatedPaymentStatus = 'partial';
            else if (netPayable === 0) updatedPaymentStatus = 'paid';

            // Update sale with return information and recalculated financial status
            await sale.update({
                returnSubtotal: returnSubtotal,
                returnDiscountAmount: returnDiscountAmount,
                returnTaxAmount: returnTaxAmountVal,
                returnTotalAmount: returnTotalAmountVal,
                netPayable: netPayable,
                paymentStatus: updatedPaymentStatus,
                creditAmount: Math.max(0, netPayable - paidAmount),
                changeAmount: Math.max(0, paidAmount - netPayable)
            }, { transaction });
        } else {
            // No returns - set netPayable equal to totalAmount
            await sale.update({
                netPayable: parseFloat(sale.totalAmount)
            }, { transaction });
        }
        // 9. Update Customer Credit if there's a credit balance after returns
        if (customerId && parseFloat(sale.creditAmount) > 0) {
            const customer = await Customer.findByPk(customerId, { transaction });
            if (customer) {
                const previousCredit = parseFloat(customer.currentCredit) || 0;
                const saleCreditAmount = parseFloat(sale.creditAmount);
                const newCreditBalance = previousCredit + saleCreditAmount;

                // Update customer's current credit balance
                await customer.update({
                    currentCredit: newCreditBalance
                }, { transaction });

                // Create CustomerCredit transaction record
                await CustomerCredit.create({
                    customerId: customerId,
                    transactionType: 'credit_issued',
                    amount: saleCreditAmount,
                    balanceAmount: newCreditBalance,
                    referenceType: 'sale',
                    referenceId: sale.id,
                    status: 'pending',
                    notes: `Credit from sale ${sale.saleNumber} (Net of returns)`,
                    performedBy: user.id,
                    branchId: branchId
                }, { transaction });
            }
        }

        // 10. Process Loyalty Points (Earn & Redeem) if enabled
        if (customerId && isLoyaltyEnabled) {
            const customer = await Customer.findByPk(customerId, { transaction });
            if (customer) {
                const earnedPoints = parseInt(sale.loyaltyPointsEarned || 0);
                const redeemedPoints = parseInt(sale.loyaltyPointsRedeemed || 0);

                if (earnedPoints > 0 || redeemedPoints > 0) {
                    const oldBalance = parseInt(customer.loyaltyPoints || 0);
                    const newBalance = oldBalance + earnedPoints - redeemedPoints;

                    await customer.update({ loyaltyPoints: newBalance }, { transaction });

                    // Create Loyalty transaction records
                    if (earnedPoints > 0) {
                        await CustomerLoyalty.create({
                            customerId: customerId,
                            transactionType: 'earn',
                            points: earnedPoints,
                            balancePoints: oldBalance + earnedPoints,
                            referenceType: 'sale',
                            referenceId: sale.id,
                            notes: `Earned from sale ${sale.saleNumber}`,
                            performedBy: user.id,
                            branchId: branchId
                        }, { transaction });
                    }

                    if (redeemedPoints > 0) {
                        await CustomerLoyalty.create({
                            customerId: customerId,
                            transactionType: 'redeem',
                            points: -redeemedPoints,
                            balancePoints: newBalance,
                            referenceType: 'sale',
                            referenceId: sale.id,
                            notes: `Redeemed in sale ${sale.saleNumber}`,
                            performedBy: user.id,
                            branchId: branchId
                        }, { transaction });
                    }
                }
            }
        }

        return sale;
    }

    /**
     * Retrieves all sales with filtering, pagination, and branch access control.
     * 
     * @param {Object} filters - Filter criteria
     * @param {string} [filters.saleStatus] - Filter by sale status: 'draft'|'completed'|'cancelled'|'returned'
     * @param {string} [filters.paymentStatus] - Filter by payment status: 'pending'|'partial'|'paid'|'refunded'
     * @param {string} [filters.status] - Generic status filter (auto-detected as saleStatus or paymentStatus)
     * @param {number} [filters.customerId] - Filter by customer ID
     * @param {string} [filters.saleType] - Filter by sale type: 'retail'|'wholesale'|'online'|'phone_order'
     * @param {string} [filters.startDate] - Filter sales from this date (inclusive)
     * @param {string} [filters.endDate] - Filter sales until this date (inclusive)
     * @param {string} [filters.search] - Search in saleNumber, notes, or customer name
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Maximum number of records to return
     * @param {number} pagination.offset - Number of records to skip
     * @param {Object} branchConfig - Branch access configuration
     * @param {number} [branchConfig.branchId] - Specific branch ID to filter by
     * @param {Object} [branchConfig.branchAccess] - Branch access permissions
     * @param {boolean} [branchConfig.branchAccess.canAccessAllBranches] - Whether user can access all branches
     * @param {Array<number>} [branchConfig.branchAccess.branches] - Array of accessible branch IDs
     * @returns {Promise<{count: number, rows: Array<Object>}>} Paginated sales with customer and cashier info
     */
    async getAllSales(filters, pagination, branchConfig) {
        const { saleStatus, paymentStatus, status, customerId, saleType, startDate, endDate, search } = filters;
        const { limit, offset } = pagination;
        const { branchId, branchAccess } = branchConfig;

        const where = {
            isDeleted: false
        };

        // Branch filtering
        if (branchId) where.branchId = branchId;
        else if (branchAccess && !branchAccess.canAccessAllBranches && branchAccess.branches?.length > 0) {
            where.branchId = branchAccess.branches;
        }

        // Status filtering (handle aliases)
        if (saleStatus) where.saleStatus = saleStatus;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (status) {
            // Check if status matches any saleStatus or paymentStatus enum
            // For simplicity, we can apply it to both or decide based on value
            const saleStatusEnums = ['draft', 'completed', 'cancelled', 'returned'];
            const paymentStatusEnums = ['pending', 'partial', 'paid', 'refunded'];

            if (saleStatusEnums.includes(status)) where.saleStatus = status;
            else if (paymentStatusEnums.includes(status)) where.paymentStatus = status;
            else {
                // If generic status, maybe it's meant for saleStatus
                where.saleStatus = status;
            }
        }

        if (customerId) where.customerId = customerId;
        if (saleType) where.saleType = saleType;

        // Date range filtering
        if (startDate || endDate) {
            where.saleDate = {};
            if (startDate) where.saleDate[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.saleDate[Op.lte] = end;
            }
        }

        // Search functionality
        if (search) {
            where[Op.or] = [
                { saleNumber: { [Op.like]: `%${search}%` } },
                { notes: { [Op.like]: `%${search}%` } },
                db.sequelize.where(
                    db.sequelize.col('customer.customer_name'),
                    { [Op.like]: `%${search}%` }
                )
            ];
        }

        return await Sale.findAndCountAll({
            where,
            limit,
            offset,
            subQuery: false, // Fix for associated model filtering/sorting
            distinct: true,  // Ensure correct count when joins are involved
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'customerCode', 'customerName', 'phone']
                },
                {
                    model: User,
                    as: 'cashier',
                    attributes: ['id', 'userName', 'phone']
                }
            ]
        });
    }

    /**
     * Retrieves a single sale by ID or sale number with all related data.
     * Includes items, payments, customer, cashier, and applied promotions.
     * 
     * @param {string|number} idOrSaleNumber - Sale ID (numeric) or sale number (string like 'SAL-20260120-0001')
     * @returns {Promise<Object|null>} Sale object with items, payments, customer, cashier, and promotions, or null if not found
     */
    async getSaleById(idOrSaleNumber) {
        let where = {};

        // Determine if input is ID (integer) or SaleNumber (string)
        // Check if it's purely numeric
        if (/^\d+$/.test(idOrSaleNumber)) {
            where.id = idOrSaleNumber;
        } else {
            where.saleNumber = idOrSaleNumber;
        }

        return await Sale.findOne({
            where,
            include: [
                {
                    model: SaleItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'productCode', 'name', 'unitOfMeasure']
                    }]
                },
                {
                    model: SalePayment,
                    as: 'payments',
                    include: [{
                        model: User,
                        as: 'processor',
                        attributes: ['id', 'userName', 'phone']
                    }]
                },
                {
                    model: Customer,
                    as: 'customer'
                },
                {
                    model: User,
                    as: 'cashier',
                    attributes: ['id', 'userName', 'phone']
                },
                {
                    model: db.Promotion,
                    as: 'promotion',
                    attributes: ['id', 'title', 'couponCode']
                },
                {
                    model: db.Promotion,
                    as: 'appliedPromotions',
                    through: { attributes: ['discountAmount', 'promoCode'] } // Include junction table data
                },
                {
                    model: SaleReturnItem,
                    as: 'returnItems',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'productCode', 'name', 'unitOfMeasure']
                    }]
                }
            ]
        });
    }

    /**
     * Updates an existing sale's editable fields (notes, customerNotes, etc.).
     * Cannot update cancelled sales.
     * 
     * @param {number} id - Sale ID
     * @param {Object} data - Fields to update
     * @param {string} [data.notes] - Internal sale notes
     * @param {string} [data.customerNotes] - Customer-facing notes
     * @param {Object} transaction - Sequelize transaction object
     * @returns {Promise<Object|null>} Updated sale object, or null if not found
     * @throws {Error} If attempting to update a cancelled sale
     */
    async updateSale(id, data, transaction) {
        const sale = await Sale.findByPk(id, { transaction });
        if (!sale) return null;
        if (sale.saleStatus === 'cancelled') throw new Error('Cannot update a cancelled sale');

        await sale.update(data, { transaction });
        return sale;
    }

    /**
     * Cancels a sale, restoring inventory and reversing customer credit/loyalty changes.
     * Creates inventory ledger entries to restore stock for all sale items.
     * 
     * @param {number} id - Sale ID to cancel
     * @param {Object} user - User performing the cancellation (requires id property)
     * @param {Object} transaction - Sequelize transaction object
     * @returns {Promise<Object>} The cancelled sale object
     * @throws {Error} If sale not found
     * @throws {Error} If sale is already cancelled
     */
    async cancelSale(id, user, transaction) {
        const sale = await Sale.findByPk(id, {
            include: [{ model: SaleItem, as: 'items' }],
            transaction
        });

        if (!sale) throw new Error('Sale not found');
        if (sale.saleStatus === 'cancelled') throw new Error('Sale is already cancelled');

        for (const item of sale.items) {
            const inventoryWhere = {
                productId: item.productId,
                quantity: { [Op.gt]: 0 }
            };
            // Try to find inventory in same branch?
            if (sale.branchId) inventoryWhere.branchId = sale.branchId;

            const latestBatch = await Inventory.findOne({
                where: inventoryWhere,
                order: [['createdAt', 'DESC']],
                transaction
            });

            if (latestBatch) {
                // ⚠️ DO NOT UPDATE the batch - inventory is a ledger (immutable)
                // Just create a new positive entry to restore the stock

                await Inventory.create({
                    productId: item.productId,
                    grnId: latestBatch.grnId, // Copy GRN reference
                    supplierId: latestBatch.supplierId, // Copy supplier ID
                    supplierName: latestBatch.supplierName, // Copy supplier name
                    supplierPhone: latestBatch.supplierPhone, // Copy supplier phone
                    referenceType: 'sale',
                    batchNumber: latestBatch.batchNumber,
                    expiryDate: latestBatch.expiryDate,
                    locationId: latestBatch.locationId, // Copy location
                    branchId: sale.branchId,
                    quantity: item.quantity,
                    unitCost: latestBatch.unitCost,
                    sellingPrice: latestBatch.sellingPrice,
                    mrp: latestBatch.mrp,
                    performedBy: user.id,
                    remarks: `Sale cancelled - Stock restored`
                }, { transaction });
            } else {
                const product = await Product.findByPk(item.productId, { transaction });
                await Inventory.create({
                    productId: item.productId,
                    referenceType: 'adjustment',
                    quantity: item.quantity,
                    unitCost: product.costPrice || 0,
                    sellingPrice: item.unitPrice,
                    performedBy: user.id,
                    branchId: sale.branchId,
                    remarks: 'Restored from cancelled sale - New batch created'
                }, { transaction });
            }

            await ProductAuditLog.create({
                productId: item.productId,
                action: 'stock_adjusted',
                field: 'quantity',
                oldValue: '?', // Simplified
                newValue: '?',
                changedBy: user.id,
                branchId: sale.branchId,
                notes: `Sale cancelled - ${item.quantity} units restored`
            }, { transaction });
        }

        if (sale.customerId) {
            const customer = await Customer.findByPk(sale.customerId, { transaction });
            if (customer) {
                await customer.update({
                    totalPurchases: parseFloat(customer.totalPurchases) - parseFloat(sale.totalAmount),
                    totalOrders: customer.totalOrders - 1,
                    loyaltyPoints: customer.loyaltyPoints - sale.loyaltyPointsEarned + sale.loyaltyPointsRedeemed,
                    currentCredit: parseFloat(customer.currentCredit) - parseFloat(sale.creditAmount)
                }, { transaction });
            }
        }

        await sale.update({
            saleStatus: 'cancelled',
            paymentStatus: 'cancelled'
        }, { transaction });

        return sale;
    }
}

module.exports = new SaleService();
