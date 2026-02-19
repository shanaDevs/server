// src/services/emails/promotionEmailService.js
const nodemailer = require('nodemailer');
const db = require('../../models');
const barcodeGenerator = require('../../utils/barcodeGenerator');
require('dotenv').config();

class PromotionEmailService {
    constructor() {
        this.transporter = null;
    }

    // Initialize transporter
    getTransporter() {
        if (this.transporter) return this.transporter;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ Email credentials not configured.');
            return null;
        }

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        return this.transporter;
    }

    /**
     * Generate beautiful promotion email HTML
     */
    generatePromotionEmailHTML(promotion, customer, barcodeImage = null) {
        console.log('🔍 Generating email HTML for promotion data:', JSON.stringify(promotion, null, 2));

        // Handle different field name conventions (camelCase vs snake_case)
        const promotionName = promotion.promotionName || promotion.promotion_name || promotion.title || promotion.name || 'Special Promotion';
        const promotionDescription = promotion.promotionDescription || promotion.promotion_description || promotion.description || '';
        const promotionType = promotion.promotionType || promotion.promotion_type;
        const discountType = promotion.discountType || promotion.discount_type;
        const discountValue = promotion.discountValue || promotion.discount_value || 0;
        const couponCode = promotion.couponCode || promotion.coupon_code || promotion.promoCode || promotion.promo_code;
        const startDate = promotion.startDate || promotion.start_date;
        const endDate = promotion.endDate || promotion.end_date;
        const minPurchaseAmount = promotion.minPurchaseAmount || promotion.min_purchase_amount || promotion.minimumPurchaseAmount || promotion.minimum_purchase_amount;
        const maxDiscountAmount = promotion.maxDiscountAmount || promotion.max_discount_amount || promotion.maximumDiscountAmount || promotion.maximum_discount_amount;

        // Format dates
        const formatDate = (date) => {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        };

        // Calculate discount display
        let discountDisplay = 'Special Discount';
        if (discountType === 'PERCENTAGE') {
            discountDisplay = `${discountValue}% OFF`;
        } else if (discountType === 'FIXED_AMOUNT') {
            discountDisplay = `Rs. ${discountValue} OFF`;
        }

        // Build barcode section
        let barcodeSection = '';
        if (couponCode && barcodeImage) {
            barcodeSection = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin: 30px 0; text-align: center;">
                    <h2 style="color: white; margin: 0 0 10px 0; font-size: 28px;">🎉 Your Exclusive Coupon Code</h2>
                    <div style="background: white; padding: 25px; border-radius: 10px; margin: 20px auto; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">SCAN THIS CODE AT CHECKOUT</p>
                        <img src="cid:barcodeImage" alt="Barcode" style="max-width: 100%; height: auto; margin: 15px 0;" />
                        <p style="margin: 15px 0 5px 0; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace;">${couponCode}</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">Copy this code or scan the barcode</p>
                    </div>
                </div>
            `;
        } else if (couponCode) {
            barcodeSection = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin: 30px 0; text-align: center;">
                    <h2 style="color: white; margin: 0 0 10px 0; font-size: 28px;">🎉 Your Exclusive Coupon Code</h2>
                    <div style="background: white; padding: 25px; border-radius: 10px; margin: 20px auto; max-width: 400px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        <p style="margin: 15px 0 5px 0; font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace;">${couponCode}</p>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">Use this code at checkout</p>
                    </div>
                </div>
            `;
        }

        // Build conditions section
        let conditionsHTML = '';
        const conditions = [];
        
        if (minPurchaseAmount && minPurchaseAmount > 0) {
            conditions.push(`Minimum purchase of Rs. ${minPurchaseAmount}`);
        }
        if (maxDiscountAmount && maxDiscountAmount > 0 && discountType === 'PERCENTAGE') {
            conditions.push(`Maximum discount of Rs. ${maxDiscountAmount}`);
        }
        if (startDate && endDate) {
            conditions.push(`Valid from ${formatDate(startDate)} to ${formatDate(endDate)}`);
        }

        if (conditions.length > 0) {
            conditionsHTML = `
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 25px 0;">
                    <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📋 Terms & Conditions</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                        ${conditions.map(c => `<li style="margin: 8px 0;">${c}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${promotionName}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 650px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                    
                    <!-- Header Banner -->
                    <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%); padding: 50px 30px; text-align: center; position: relative;">
                        <div style="font-size: 60px; margin-bottom: 10px;">🎊</div>
                        <h1 style="color: white; margin: 0; font-size: 36px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                            Special Offer Just for You!
                        </h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">
                            Dear ${customer.customerName || 'Valued Customer'}, we have something exciting! 🎁
                        </p>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 40px 30px;">
                        
                        <!-- Promotion Title -->
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #333; margin: 0 0 15px 0; font-size: 32px; font-weight: bold;">
                                ${promotionName}
                            </h2>
                            <div style="background: linear-gradient(135deg, #FF6B6B, #FFE66D); color: white; display: inline-block; padding: 12px 30px; border-radius: 50px; font-size: 24px; font-weight: bold; box-shadow: 0 4px 15px rgba(255,107,107,0.3);">
                                ${discountDisplay}
                            </div>
                        </div>

                        <!-- Description -->
                        ${promotionDescription ? `
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 15px; margin: 25px 0; border-left: 5px solid #FF6B6B;">
                                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #444;">
                                    ${promotionDescription}
                                </p>
                            </div>
                        ` : ''}

                        <!-- Barcode/Coupon Section -->
                        ${barcodeSection}

                        <!-- Conditions -->
                        ${conditionsHTML}

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${process.env.STORE_URL || '#'}" style="display: inline-block; background: linear-gradient(135deg, #FF6B6B, #FF8E53); color: white; padding: 18px 50px; text-decoration: none; border-radius: 50px; font-size: 18px; font-weight: bold; box-shadow: 0 8px 20px rgba(255,107,107,0.3); transition: all 0.3s;">
                                🛍️ Shop Now
                            </a>
                        </div>

                        <!-- Urgency Message -->
                        ${endDate ? `
                            <div style="text-align: center; margin: 25px 0;">
                                <p style="color: #FF6B6B; font-size: 16px; font-weight: bold; margin: 0;">
                                    ⏰ Offer ends on ${formatDate(endDate)}
                                </p>
                                <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">
                                    Don't miss out on this amazing deal!
                                </p>
                            </div>
                        ` : ''}

                    </div>

                    <!-- Footer -->
                    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                            Thank you for being a valued customer! 💝
                        </p>
                        <p style="margin: 10px 0; color: #999; font-size: 12px;">
                            ${process.env.COMPANY_NAME || 'Your Company'} | ${process.env.COMPANY_EMAIL || 'info@company.com'}
                        </p>
                        <p style="margin: 10px 0; color: #999; font-size: 11px;">
                            You're receiving this email because you're our valued customer.
                        </p>
                        <div style="margin-top: 20px;">
                            <a href="#" style="color: #999; text-decoration: none; font-size: 12px; margin: 0 10px;">📧 Contact Us</a>
                            <a href="#" style="color: #999; text-decoration: none; font-size: 12px; margin: 0 10px;">🌐 Visit Website</a>
                        </div>
                    </div>

                </div>
            </body>
            </html>
        `;
    }

    /**
     * Send promotion email to a single customer
     */
    async sendPromotionEmail(promotion, customer, options = {}) {
        // Get promotion name with fallback (extract early to use in subject)
        const promotionName = promotion.promotionName || promotion.promotion_name || promotion.title || promotion.name || 'Special Promotion';
        const promotionDescription = promotion.promotionDescription || promotion.promotion_description || promotion.description || '';
        const couponCode = promotion.couponCode || promotion.coupon_code || promotion.promoCode || promotion.promo_code;
        
        const transporter = this.getTransporter();
        if (!transporter) {
            console.warn('⚠️ Email transporter not configured');
            return { success: false, reason: 'no_credentials' };
        }

        // Validate customer email
        if (!customer.email || !customer.email.includes('@')) {
            console.warn(`⚠️ Invalid email for customer ${customer.customerName}`);
            return { success: false, reason: 'invalid_email', customer: customer.customerName };
        }

        try {
            let barcodeImage = null;
            const attachments = [];

            // Generate barcode if coupon code exists
            if (couponCode) {
                try {
                    barcodeImage = await barcodeGenerator.generateBarcode(
                        couponCode,
                        {
                            bcid: 'code128',
                            scale: 4,
                            height: 15,
                            includetext: true,
                            textxalign: 'center'
                        }
                    );

                    attachments.push({
                        filename: 'coupon-barcode.png',
                        content: barcodeImage,
                        cid: 'barcodeImage'
                    });
                } catch (error) {
                    console.warn('⚠️ Failed to generate barcode:', error.message);
                }
            }

            // Generate email HTML
            const htmlContent = this.generatePromotionEmailHTML(promotion, customer, barcodeImage);

            // Send email
            const mailOptions = {
                from: `${process.env.COMPANY_NAME || 'Your Store'} <${process.env.EMAIL_USER}>`,
                to: customer.email,
                subject: `🎉 ${promotionName} - Exclusive Offer Inside!`,
                html: htmlContent,
                attachments: attachments
            };

            const info = await transporter.sendMail(mailOptions);
            
            console.log(`✅ Promotion email sent to ${customer.email}`);

            // Log successful notification to database
            try {
                await db.NotificationLog.create({
                    customerId: customer.id,
                    eventType: 'PROMOTION',
                    messageType: 'promotion_announcement',
                    channel: 'EMAIL',
                    recipientEmail: customer.email,
                    recipientPhone: customer.phone || null,
                    status: 'sent',
                    subject: `${promotionName} - Exclusive Offer Inside!`,
                    messageBody: promotionDescription || `New promotion: ${promotionName}`,
                    relatedEntityType: 'PROMOTION',
                    relatedEntityId: promotion.id,
                    metadata: JSON.stringify({
                        promotionId: promotion.id,
                        promotionName: promotionName,
                        couponCode: couponCode || null,
                        messageId: info.messageId,
                        hasCouponCode: !!couponCode,
                        hasBarcode: !!barcodeImage
                    })
                });
                console.log(`📝 Notification logged for customer ${customer.customerName}`);
            } catch (logError) {
                console.warn('⚠️ Failed to log notification:', logError.message);
            }
            
            return {
                success: true,
                messageId: info.messageId,
                customer: customer.customerName,
                email: customer.email
            };

        } catch (error) {
            console.error(`❌ Failed to send promotion email to ${customer.email}:`, error.message);

            // Log failed notification to database
            try {
                await db.NotificationLog.create({
                    customerId: customer.id,
                    eventType: 'PROMOTION',
                    messageType: 'promotion_announcement',
                    channel: 'EMAIL',
                    recipientEmail: customer.email,
                    recipientPhone: customer.phone || null,
                    status: 'failed',
                    subject: `${promotionName} - Exclusive Offer Inside!`,
                    messageBody: promotionDescription || `New promotion: ${promotionName}`,
                    relatedEntityType: 'PROMOTION',
                    relatedEntityId: promotion.id,
                    errorMessage: error.message,
                    metadata: JSON.stringify({
                        promotionId: promotion.id,
                        promotionName: promotionName,
                        couponCode: couponCode || null,
                        errorDetails: error.stack || error.message
                    })
                });
                console.log(`📝 Failed notification logged for customer ${customer.customerName}`);
            } catch (logError) {
                console.warn('⚠️ Failed to log failed notification:', logError.message);
            }
            
            return {
                success: false,
                reason: 'send_failed',
                error: error.message,
                customer: customer.customerName,
                email: customer.email
            };
        }
    }

    /**
     * Send promotion emails to multiple customers
     */
    async sendBulkPromotionEmails(promotion, customers, options = {}) {
        const { batchSize = 10, delayBetweenBatches = 2000 } = options;
        
        const results = {
            total: customers.length,
            successful: 0,
            failed: 0,
            details: []
        };

        console.log(`📧 Starting bulk promotion email send to ${customers.length} customers...`);

        // Process in batches to avoid overwhelming the email server
        for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            
            const batchPromises = batch.map(customer => 
                this.sendPromotionEmail(promotion, customer, options)
            );

            const batchResults = await Promise.all(batchPromises);
            
            batchResults.forEach(result => {
                if (result.success) {
                    results.successful++;
                } else {
                    results.failed++;
                }
                results.details.push(result);
            });

            // Log progress
            console.log(`📊 Progress: ${Math.min(i + batchSize, customers.length)}/${customers.length} emails processed`);

            // Delay between batches (except for the last batch)
            if (i + batchSize < customers.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        console.log(`✅ Bulk email send complete: ${results.successful} successful, ${results.failed} failed`);
        
        return results;
    }
}

module.exports = new PromotionEmailService();
