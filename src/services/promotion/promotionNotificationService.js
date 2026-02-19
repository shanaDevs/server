// src/services/promotion/promotionNotificationService.js
const db = require('../../models');
const promotionEmailService = require('../emails/promotionEmailService');
const notificationService = require('../notifications/notificationService');

const { Customer, NotificationLog, SystemSettings } = db;

class PromotionNotificationService {
    /**
     * Get all active customers
     */
    async getAllActiveCustomers() {
        try {
            const customers = await Customer.findAll({
                where: {
                    isActive: true,
                    optOutNotifications: false
                },
                attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
            });

            return customers;
        } catch (error) {
            console.error('❌ Error fetching active customers:', error.message);
            throw error;
        }
    }

    /**
     * Get customers with valid email addresses
     */
    async getCustomersWithEmail() {
        try {
            const customers = await Customer.findAll({
                where: {
                    isActive: true,
                    optOutNotifications: false,
                    email: {
                        [db.Sequelize.Op.ne]: null,
                        [db.Sequelize.Op.like]: '%@%'
                    }
                },
                attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
            });

            console.log(`📧 Found ${customers.length} customers with valid email addresses`);
            return customers;
        } catch (error) {
            console.error('❌ Error fetching customers with email:', error.message);
            throw error;
        }
    }

    /**
     * Get customers with valid phone numbers
     */
    async getCustomersWithPhone() {
        try {
            const customers = await Customer.findAll({
                where: {
                    isActive: true,
                    optOutNotifications: false,
                    phone: {
                        [db.Sequelize.Op.ne]: null
                    }
                },
                attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
            });

            console.log(`📱 Found ${customers.length} customers with phone numbers`);
            return customers;
        } catch (error) {
            console.error('❌ Error fetching customers with phone:', error.message);
            throw error;
        }
    }

    /**
     * Log notification to database
     */
    async logNotification(customerId, promotion, channel, status, details = {}) {
        try {
            const log = await NotificationLog.create({
                customerId: customerId,
                eventType: 'PROMOTION',
                messageType: 'promotion_announcement',
                channel: channel,
                recipientEmail: details.email || null,
                recipientPhone: details.phone || null,
                status: status,
                subject: `${promotion.promotionName}`,
                messageBody: promotion.promotionDescription || `New promotion: ${promotion.promotionName}`,
                relatedEntityType: 'PROMOTION',
                relatedEntityId: promotion.id,
                errorMessage: details.errorMessage || null,
                metadata: {
                    promotionId: promotion.id,
                    promotionName: promotion.promotionName,
                    couponCode: promotion.couponCode || null,
                    discountType: promotion.discountType,
                    discountValue: promotion.discountValue
                }
            });

            return log;
        } catch (error) {
            console.error('⚠️ Failed to log notification:', error.message);
        }
    }

    /**
     * Send promotion notifications via EMAIL
     */
    async sendEmailNotifications(promotion, options = {}) {
        console.log('📧 Starting email notification send...');
        
        const customers = await this.getCustomersWithEmail();
        
        if (customers.length === 0) {
            console.log('⚠️ No customers with email found');
            return {
                channel: 'EMAIL',
                total: 0,
                successful: 0,
                failed: 0,
                details: []
            };
        }

        const results = await promotionEmailService.sendBulkPromotionEmails(
            promotion, 
            customers, 
            options
        );

        // Log all notifications
        for (const result of results.details) {
            const customer = customers.find(c => c.email === result.email);
            if (customer) {
                await this.logNotification(
                    customer.id,
                    promotion,
                    'EMAIL',
                    result.success ? 'sent' : 'failed',
                    {
                        email: result.email,
                        errorMessage: result.error || null
                    }
                );
            }
        }

        return {
            channel: 'EMAIL',
            ...results
        };
    }

    /**
     * Send promotion notifications via SMS
     */
    async sendSMSNotifications(promotion, options = {}) {
        console.log('📱 Starting SMS notification send...');
        
        const customers = await this.getCustomersWithPhone();
        
        if (customers.length === 0) {
            console.log('⚠️ No customers with phone numbers found');
            return {
                channel: 'SMS',
                total: 0,
                successful: 0,
                failed: 0,
                details: []
            };
        }

        // Check if SMS gateway is available
        const smsAvailable = notificationService.isSMSGatewayAvailable();
        if (!smsAvailable) {
            console.warn('⚠️ SMS Gateway not configured. Skipping SMS notifications.');
            return {
                channel: 'SMS',
                total: customers.length,
                successful: 0,
                failed: customers.length,
                details: [],
                error: 'SMS gateway not configured'
            };
        }

        // Prepare SMS message
        let smsMessage = `🎉 ${promotion.promotionName}\n\n`;
        
        if (promotion.discountType === 'PERCENTAGE') {
            smsMessage += `Get ${promotion.discountValue}% OFF! `;
        } else if (promotion.discountType === 'FIXED_AMOUNT') {
            smsMessage += `Get Rs. ${promotion.discountValue} OFF! `;
        }

        if (promotion.couponCode) {
            smsMessage += `\n\nUse code: ${promotion.couponCode}`;
        }

        if (promotion.endDate) {
            const endDate = new Date(promotion.endDate).toLocaleDateString();
            smsMessage += `\n\nValid till: ${endDate}`;
        }

        smsMessage += `\n\nVisit us today! - ${process.env.COMPANY_NAME || 'Your Store'}`;

        const results = {
            channel: 'SMS',
            total: customers.length,
            successful: 0,
            failed: 0,
            details: []
        };

        // Send SMS to each customer
        const twilioClient = notificationService.getTwilioClient();
        
        for (const customer of customers) {
            try {
                await twilioClient.messages.create({
                    body: smsMessage,
                    from: process.env.TWILIO_PHONE,
                    to: customer.phone
                });

                results.successful++;
                results.details.push({
                    success: true,
                    customer: customer.customerName,
                    phone: customer.phone
                });

                // Log notification
                await this.logNotification(
                    customer.id,
                    promotion,
                    'SMS',
                    'sent',
                    { phone: customer.phone }
                );

            } catch (error) {
                console.error(`❌ Failed to send SMS to ${customer.phone}:`, error.message);
                
                results.failed++;
                results.details.push({
                    success: false,
                    customer: customer.customerName,
                    phone: customer.phone,
                    error: error.message
                });

                // Log failed notification
                await this.logNotification(
                    customer.id,
                    promotion,
                    'SMS',
                    'failed',
                    {
                        phone: customer.phone,
                        errorMessage: error.message
                    }
                );
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`✅ SMS send complete: ${results.successful} successful, ${results.failed} failed`);
        
        return results;
    }

    /**
     * Send promotion notifications to all customers
     * Automatically determines channel based on system settings
     */
    async sendPromotionToAllCustomers(promotion, options = {}) {
        console.log(`🚀 Starting promotion notification broadcast for: ${promotion.promotionName}`);
        
        // Get notification settings
        const channels = await notificationService.determineChannels();
        
        const results = {
            promotionId: promotion.id,
            promotionName: promotion.promotionName,
            channels: [],
            totalCustomersReached: 0,
            summary: {
                email: null,
                sms: null
            }
        };

        // Send via EMAIL if enabled
        if (channels.useEmail) {
            console.log('📧 Email notifications enabled');
            const emailResults = await this.sendEmailNotifications(promotion, options);
            results.channels.push('EMAIL');
            results.summary.email = emailResults;
            results.totalCustomersReached += emailResults.successful;
        }

        // Send via SMS if enabled
        if (channels.useSMS) {
            console.log('📱 SMS notifications enabled');
            const smsResults = await this.sendSMSNotifications(promotion, options);
            results.channels.push('SMS');
            results.summary.sms = smsResults;
            
            // Only count if email wasn't sent (to avoid double counting)
            if (!channels.useEmail) {
                results.totalCustomersReached += smsResults.successful;
            }
        }

        console.log(`\n✅ Promotion broadcast complete!`);
        console.log(`📊 Total customers reached: ${results.totalCustomersReached}`);
        
        return results;
    }
}

module.exports = new PromotionNotificationService();
