// src/services/notifications/notificationService.js
const db = require('../../models');
const emailService = require('../emails/emailService');
const twilio = require('twilio');
require('dotenv').config();

const { NotificationLog, Customer, SystemSettings } = db;

// Twilio client (lazy initialization)
let twilioClient = null;

class NotificationService {
    /**
     * Get system notification settings
     */
    async getNotificationSettings(branchId = null) {
        // System settings are global, not per branch
        const settings = await SystemSettings.findOne();
        
        // Default settings if none exist
        return {
            notificationChannel: settings?.notificationChannel || 'EMAIL_ONLY',
            enableEmailNotifications: settings?.enableEmailNotifications !== false,
            enableSMSNotifications: settings?.enableSMSNotifications !== false
        };
    }

    /**
     * Check if SMS gateway is available
     */
    isSMSGatewayAvailable() {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE) {
            console.warn('⚠️ SMS Gateway not configured');
            return false;
        }
        return true;
    }

    /**
     * Get Twilio client (initialize if needed)
     */
    getTwilioClient() {
        if (!twilioClient && this.isSMSGatewayAvailable()) {
            twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }
        return twilioClient;
    }

    /**
     * Determine which channels to use based on system settings and availability
     */
    async determineChannels(branchId = null) {
        const settings = await this.getNotificationSettings(branchId);
        const smsAvailable = this.isSMSGatewayAvailable();
        
        let channel = settings.notificationChannel;
        
        // Fallback logic if SMS not available
        if ((channel === 'SMS_ONLY' || channel === 'EMAIL_AND_SMS') && !smsAvailable) {
            console.warn('⚠️ SMS requested but gateway not available. Falling back to EMAIL_ONLY');
            channel = 'EMAIL_ONLY';
        }
        
        return {
            useEmail: channel === 'EMAIL_ONLY' || channel === 'EMAIL_AND_SMS',
            useSMS: channel === 'SMS_ONLY' || (channel === 'EMAIL_AND_SMS' && smsAvailable),
            originalChannel: channel,
            smsAvailable
        };
    }

    /**
     * Check if customer has opted out
     */
    async hasOptedOut(customerId) {
        const customer = await Customer.findByPk(customerId);
        return customer?.optOutNotifications === true;
    }

    /**
     * Check if duplicate notification already sent
     * For birthday notifications, checks within the current birthday year
     * For other notifications, checks within specified hours
     */
    async isDuplicate(customerId, eventType, messageType = null, withinHours = 24) {
        let where = {
            customerId,
            eventType
        };
        
        // For birthday notifications, check if already sent this birthday year
        if (eventType === 'BIRTHDAY') {
            // Get customer's birthday to determine the year range
            const customer = await Customer.findByPk(customerId);
            if (customer && customer.customerBirthday) {
                const today = new Date();
                const birthMonth = customer.customerBirthday.getMonth();
                const birthDay = customer.customerBirthday.getDate();
                
                // Calculate start of current birthday year
                // If today is before this year's birthday, check from last year's birthday
                // If today is on/after this year's birthday, check from this year's birthday
                let yearStart;
                const thisYearBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
                
                if (today < thisYearBirthday) {
                    // Before this year's birthday, so last birthday was last year
                    yearStart = new Date(today.getFullYear() - 1, birthMonth, birthDay);
                } else {
                    // On or after this year's birthday
                    yearStart = thisYearBirthday;
                }
                
                where.createdAt = { [db.Sequelize.Op.gte]: yearStart };
                
                console.log(`🔍 Duplicate check: Birthday year starts from ${yearStart.toISOString()}`);
            }
        } else {
            // For other event types, use time-based check
            const since = new Date(Date.now() - (withinHours * 60 * 60 * 1000));
            where.createdAt = { [db.Sequelize.Op.gte]: since };
        }
        
        if (messageType) {
            where.messageType = messageType;
        }
        
        const existing = await NotificationLog.findOne({ where });
        
        if (existing) {
            console.log(`⏭️  Duplicate notification prevented for customer ${customerId}`);
        }
        
        return !!existing;
    }

    /**
     * Send notification via email
     */
    async sendEmail(customer, subject, body, options = {}) {
        console.log(`\n📧 === EMAIL SEND ATTEMPT ===`);
        console.log(`📧 Customer: ${customer.customerName}`);
        console.log(`📧 Email address: ${customer.email}`);
        console.log(`📧 Subject: ${subject}`);
        
        if (!customer.email) {
            console.log(`❌ No email address found for customer`);
            return { status: 'FAILED', error: 'No email address' };
        }

        try {
            console.log(`📧 Calling emailService.sendEmail...`);
            const result = await emailService.sendEmail({
                to: customer.email,
                subject,
                html: body,
                ...options
            });
            
            console.log(`✅ Email sent successfully:`, result);
            return {
                status: 'SENT',
                sentAt: new Date()
            };
        } catch (error) {
            console.error('❌ Email send failed:', error.message);
            console.error('❌ Error stack:', error.stack);
            return {
                status: 'FAILED',
                error: error.message
            };
        }
    }

    /**
     * Send notification via SMS
     */
    async sendSMS(customer, message, options = {}) {
        if (!customer.phone) {
            return { status: 'FAILED', error: 'No phone number' };
        }

        const client = this.getTwilioClient();
        if (!client) {
            return { status: 'FAILED', error: 'SMS gateway not available' };
        }

        try {
            // Convert phone to E.164 format
            let phoneNumber = customer.phone;
            if (phoneNumber.startsWith('0')) {
                phoneNumber = '+94' + phoneNumber.slice(1);
            }

            // Ensure message is under 160 characters
            if (message.length > 160) {
                console.warn('⚠️ SMS message truncated to 160 characters');
                message = message.substring(0, 157) + '...';
            }

            const result = await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE,
                to: phoneNumber
            });

            return {
                status: 'SENT',
                sentAt: new Date(),
                sid: result.sid
            };
        } catch (error) {
            console.error('❌ SMS send failed:', error.message);
            return {
                status: 'FAILED',
                error: error.message
            };
        }
    }

    /**
     * Main method to send notification with proper channel selection
     */
    async sendNotification(customerId, eventType, content, options = {}) {
        const {
            messageType = null,
            relatedEntityType = null,
            relatedEntityId = null,
            branchId = null,
            sentBy = null,
            skipDuplicateCheck = false // Add option to skip duplicate check for testing
        } = options;

        try {
            // 1. Get customer
            const customer = await Customer.findByPk(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // 2. Validation checks
            if (await this.hasOptedOut(customerId)) {
                console.log(`⛔ Customer ${customerId} has opted out of notifications`);
                return { success: false, reason: 'Customer opted out' };
            }

            if (!skipDuplicateCheck && await this.isDuplicate(customerId, eventType, messageType)) {
                console.log(`⏭️  Duplicate notification prevented for customer ${customerId}`);
                return { success: false, reason: 'Duplicate notification' };
            }

            // 3. Determine channels
            const channels = await this.determineChannels(branchId);

            // Map system settings channel to notification log format
            let notificationChannelValue;
            if (channels.useEmail && channels.useSMS) {
                notificationChannelValue = 'BOTH';
            } else if (channels.useSMS) {
                notificationChannelValue = 'SMS';
            } else {
                notificationChannelValue = 'EMAIL';
            }

            // 4. Prepare notification log
            const logData = {
                customerId,
                eventType,
                messageType,
                notificationChannel: notificationChannelValue,
                recipientEmail: customer.email,
                recipientPhone: customer.phone,
                emailContent: content.email?.body || null,
                smsContent: content.sms || null,
                relatedEntityType,
                relatedEntityId,
                branchId,
                sentBy,
                emailStatus: channels.useEmail ? 'PENDING' : 'NOT_APPLICABLE',
                smsStatus: channels.useSMS ? 'PENDING' : 'NOT_APPLICABLE'
            };

            const notificationLog = await NotificationLog.create(logData);
            console.log(`📝 Notification log created: ID=${notificationLog.id}`);

            // 5. Send via appropriate channels
            const results = {};

            console.log(`\n📊 === SENDING NOTIFICATION ===`);
            console.log(`📊 Customer: ${customer.customerName} (${customer.email})`);
            console.log(`📊 Event: ${eventType} - ${messageType}`);
            console.log(`📊 Channels: Email=${channels.useEmail}, SMS=${channels.useSMS}`);
            console.log(`📊 Content.email:`, content.email ? 'Available' : 'Missing');

            if (channels.useEmail && content.email) {
                console.log(`📧 Attempting to send email...`);
                const emailResult = await this.sendEmail(
                    customer,
                    content.email.subject,
                    content.email.body,
                    options
                );
                console.log(`📧 Email result:`, emailResult);
                results.email = emailResult;
                
                await notificationLog.update({
                    emailStatus: emailResult.status,
                    emailSentAt: emailResult.sentAt || null
                });
            }

            if (channels.useSMS && content.sms) {
                const smsResult = await this.sendSMS(customer, content.sms, options);
                results.sms = smsResult;
                
                await notificationLog.update({
                    smsStatus: smsResult.status,
                    smsSentAt: smsResult.sentAt || null
                });
            }

            // 6. Update error message if any failed
            const errors = [];
            if (results.email?.status === 'FAILED') errors.push(`Email: ${results.email.error}`);
            if (results.sms?.status === 'FAILED') errors.push(`SMS: ${results.sms.error}`);
            
            if (errors.length > 0) {
                await notificationLog.update({ errorMessage: errors.join('; ') });
            }

            return {
                success: true,
                logId: notificationLog.id,
                channels: {
                    email: results.email?.status || 'NOT_SENT',
                    sms: results.sms?.status || 'NOT_SENT'
                }
            };
        } catch (error) {
            console.error('❌ Notification service error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new NotificationService();
