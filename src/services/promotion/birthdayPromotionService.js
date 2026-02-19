/**
 * Birthday Promotion Service
 * Handles the three-stage birthday promotion workflow
 */

const db = require('../../models');
const nodemailer = require('nodemailer');
const { generateUniqueCoupon } = require('../../utils/couponGenerator');
const {
    getEarlyWarningEmail,
    getReminderEmail,
    getBirthdayEmail
} = require('../emails/birthdayPromotionEmailTemplates');
require('dotenv').config();

const { Customer, Promotion, NotificationLog, sequelize } = db;

class BirthdayPromotionService {
    constructor() {
        this.transporter = null;
    }

    /**
     * Initialize email transporter
     */
    getTransporter() {
        if (this.transporter) return this.transporter;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ Email credentials not configured');
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
     * Send email using Nodemailer
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} html - Email HTML content
     * @returns {Promise<boolean>}
     */
    async sendEmail(to, subject, html) {
        console.log('\n📧 Attempting to send email...');
        console.log('   To:', to);
        console.log('   Subject:', subject);
        console.log('   EMAIL_USER:', process.env.EMAIL_USER);
        console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set');
        
        const transporter = this.getTransporter();
        
        if (!transporter) {
            console.error('❌ Email transporter not available');
            console.error('   Check EMAIL_USER and EMAIL_PASS in .env file');
            return false;
        }

        if (!to || !to.includes('@')) {
            console.error('❌ Invalid email address:', to);
            return false;
        }

        try {
            console.log('   📤 Sending email...');
            const info = await transporter.sendMail({
                from: `"Birthday Promotions" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html
            });
            
            console.log(`✅ Email sent successfully to ${to}`);
            console.log('   Message ID:', info.messageId);
            return true;
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}`);
            console.error('   Error:', error.message);
            if (error.code) {
                console.error('   Error Code:', error.code);
            }
            if (error.response) {
                console.error('   Response:', error.response);
            }
            return false;
        }
    }

    /**
     * Check if coupon code already exists in database
     * @param {string} couponCode - Coupon code to check
     * @returns {Promise<boolean>}
     */
    async couponExists(couponCode) {
        const existing = await Promotion.findOne({
            where: { couponCode }
        });
        return !!existing;
    }

    /**
     * Stage 1: Send early warning email (7 days before)
     * @param {Object} customer - Customer object
     * @returns {Promise<Object>}
     */
    async processStage1(customer) {
        console.log(`\n📧 Stage 1: Early Warning (7 days before)`);
        console.log(`   Customer: ${customer.customerName} (${customer.customerCode})`);

        // Check if already processed
        const existing = await NotificationLog.findOne({
            where: {
                customerId: customer.id,
                eventType: 'BIRTHDAY',
                messageType: 'birthday_stage1'
            }
        });

        if (existing && existing.count >= 1) {
            console.log(`   ⏭️  Already processed Stage 1 (count: ${existing.count})`);
            return { success: false, reason: 'already_processed', stage: 1 };
        }

        // Send email
        const emailTemplate = getEarlyWarningEmail(customer);
        const emailSent = await this.sendEmail(
            customer.email,
            emailTemplate.subject,
            emailTemplate.html
        );

        if (!emailSent) {
            return { success: false, reason: 'email_failed', stage: 1 };
        }

        // Log notification
        await NotificationLog.create({
            customerId: customer.id,
            eventType: 'BIRTHDAY',
            messageType: 'birthday_stage1',
            notificationChannel: 'EMAIL',
            recipientEmail: customer.email,
            emailStatus: 'SENT',
            emailContent: 'Birthday early warning email (7 days before)',
            emailSentAt: new Date()
        });

        console.log(`   ✅ Stage 1 completed successfully`);
        return { success: true, stage: 1, emailSent: true };
    }

    /**
     * Stage 2: Send reminder email (3 days before)
     * @param {Object} customer - Customer object
     * @returns {Promise<Object>}
     */
    async processStage2(customer) {
        console.log(`\n📧 Stage 2: Reminder (3 days before)`);
        console.log(`   Customer: ${customer.customerName} (${customer.customerCode})`);

        // Check if Stage 1 was completed
        const stage1Log = await NotificationLog.findOne({
            where: {
                customerId: customer.id,
                eventType: 'BIRTHDAY',
                messageType: 'birthday_stage1'
            }
        });

        if (!stage1Log) {
            console.log(`   ⏭️  Stage 1 not completed, skipping Stage 2`);
            return { success: false, reason: 'stage1_not_completed', stage: 2 };
        }

        // Send email
        const emailTemplate = getReminderEmail(customer);
        const emailSent = await this.sendEmail(
            customer.email,
            emailTemplate.subject,
            emailTemplate.html
        );

        if (!emailSent) {
            return { success: false, reason: 'email_failed', stage: 2 };
        }

        // Log notification
        await NotificationLog.create({
            customerId: customer.id,
            eventType: 'BIRTHDAY',
            messageType: 'birthday_stage2',
            notificationChannel: 'EMAIL',
            recipientEmail: customer.email,
            emailStatus: 'SENT',
            emailContent: 'Birthday reminder email (3 days before)',
            emailSentAt: new Date()
        });

        console.log(`   ✅ Stage 2 completed successfully`);
        return { success: true, stage: 2, emailSent: true };
    }

    /**
     * Stage 3: Create promotion and send birthday email
     * @param {Object} customer - Customer object
     * @returns {Promise<Object>}
     */
    async processStage3(customer) {
        console.log(`\n🎂 Stage 3: Birthday Day!`);
        console.log(`   Customer: ${customer.customerName} (${customer.customerCode})`);

        // Check if Stage 2 was completed
        const stage2Log = await NotificationLog.findOne({
            where: {
                customerId: customer.id,
                eventType: 'BIRTHDAY',
                messageType: 'birthday_stage2'
            }
        });

        if (!stage2Log) {
            console.log(`   ⏭️  Stage 2 not completed, skipping Stage 3`);
            return { success: false, reason: 'stage2_not_completed', stage: 3 };
        }

        // Use transaction for atomicity
        const transaction = await sequelize.transaction();

        try {
            // Generate unique coupon code
            const couponCode = await generateUniqueCoupon(
                customer.customerName,
                this.couponExists.bind(this)
            );

            console.log(`   🎟️  Generated coupon: ${couponCode}`);

            // Create promotion
            const now = new Date(); // Current time when email is sent
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + 7); // Valid for 7 days
            
            // Expire date: Current time + 48 hours (not birthday + 48h)
            // This ensures countdown starts from email send time (6 AM)
            const expireDate = new Date(now);
            expireDate.setHours(expireDate.getHours() + 48);

            const promotion = await Promotion.create({
                promotionType: 'BILL',
                title: `🎂 Birthday Special for ${customer.customerName.split(' ')[0]}`,
                description: `Happy Birthday! Enjoy this exclusive discount as our gift to you. Valid for 48 hours from now.`,
                couponCode: couponCode,
                discountPercentage: 15.00, // 15% discount - can be configured
                minimumPurchaseAmount: 50.00, // Minimum $50 purchase - can be configured
                maximumDiscountAmount: 50.00, // Max $50 discount - can be configured
                usageLimit: 1, // One-time use
                perCustomerLimit: 1,
                expireDate: expireDate, // Send time + 48 hours
                usageCount: 0,
                startDate: now,
                endDate: endDate,
                isActive: true,
                isDeleted: false
            }, { transaction });

            console.log(`   ✅ Promotion created (ID: ${promotion.id})`);

            // Send birthday email with promotion details
            const emailTemplate = getBirthdayEmail(customer, promotion);
            const emailSent = await this.sendEmail(
                customer.email,
                emailTemplate.subject,
                emailTemplate.html
            );

            if (!emailSent) {
                await transaction.rollback();
                return { success: false, reason: 'email_failed', stage: 3 };
            }

            // Log notification
            await NotificationLog.create({
                customerId: customer.id,
                eventType: 'BIRTHDAY',
                messageType: 'birthday_stage3',
                notificationChannel: 'EMAIL',
                recipientEmail: customer.email,
                emailStatus: 'SENT',
                emailContent: `Birthday promotion code: ${couponCode}`,
                emailSentAt: new Date(),
                relatedEntityType: 'PROMOTION',
                relatedEntityId: promotion.id
            }, { transaction });

            // Commit transaction
            await transaction.commit();

            console.log(`   ✅ Stage 3 completed successfully`);
            console.log(`   🎁 Coupon Code: ${couponCode}`);
            
            return {
                success: true,
                stage: 3,
                emailSent: true,
                promotion: {
                    id: promotion.id,
                    couponCode: promotion.couponCode,
                    discountPercentage: promotion.discountPercentage
                }
            };

        } catch (error) {
            await transaction.rollback();
            console.error(`   ❌ Stage 3 failed:`, error.message);
            return { success: false, reason: 'transaction_failed', error: error.message, stage: 3 };
        }
    }

    /**
     * Get customers with birthdays in X days
     * @param {number} daysAhead - Number of days ahead to check
     * @returns {Promise<Array>}
     */
    async getCustomersWithBirthdaysIn(daysAhead) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysAhead);

        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();

        return await Customer.findAll({
            where: {
                isActive: true,
                isDeleted: false,
                customerBirthday: {
                    [db.Sequelize.Op.ne]: null
                },
                email: {
                    [db.Sequelize.Op.ne]: null
                },
                // Match month and day using MySQL functions
                [db.Sequelize.Op.and]: [
                    sequelize.where(
                        sequelize.fn('MONTH', sequelize.col('customer_birthday')),
                        month
                    ),
                    sequelize.where(
                        sequelize.fn('DAY', sequelize.col('customer_birthday')),
                        day
                    )
                ]
            }
        });
    }
}

module.exports = new BirthdayPromotionService();
