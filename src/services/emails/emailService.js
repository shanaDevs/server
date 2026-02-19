// services/emailService.js
const nodemailer = require('nodemailer');
const db = require('../../models'); // adjust path according to your project
require('dotenv').config();

class EmailService {
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

    // Send GRN approval email
    async sendGRNApprovalEmail(grnData, pdfBuffer, options = {}) {
        const { supplierId, grnId, branchId, createdBy } = options;
        const supplierEmail = grnData.supplier?.email;
        const supplierName = grnData.supplier?.name || 'Supplier';
        const grnNumber = grnData.grnNumber;

        // Create email log

        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

        let emailLog = null;
        try {
            emailLog = await db.EmailLog.create({
                emailType: 'grn_approved',
                subject: `GRN Approved - ${grnNumber}`,
                recipientEmail: supplierEmail || 'no-email@example.com',
                recipientName: supplierName,
                senderEmail: process.env.EMAIL_USER,
                status: 'pending',
                relatedEntityType: 'GRN',
                relatedEntityId: grnId,
                relatedEntityRef: grnNumber,
                supplierId,
                branchId,
                createdBy
            });
        } catch (err) {
            console.warn('⚠️ Failed to create email log:', err.message);
        }

        // Validate email
        if (!supplierEmail || !supplierEmail.includes('@')) {
            if (emailLog) {
                await emailLog.update({
                    status: 'failed',
                    errorMessage: 'Invalid or missing supplier email'
                });
            }
            return { success: false, reason: 'invalid_email' };
        }

        const transporter = this.getTransporter();
        if (!transporter) {
            if (emailLog) {
                await emailLog.update({
                    status: 'failed',
                    errorMessage: 'Email transporter not configured'
                });
            }
            return { success: false, reason: 'no_credentials' };
        }

        console.log(`📧 Sending GRN email to: ${supplierEmail}`);

        try {
            const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
            const pdfLink = `${baseUrl}/pdfs/GRN-${grnNumber}.pdf`;

            const htmlContent = `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                        <h2 style="margin: 0;">✓ GRN Approved</h2>
                    </div>
                    <div style="padding: 30px; background-color: #f9f9f9;">
                        <p>Dear <strong>${supplierName}</strong>,</p>
                        <p>Your Goods Receipt Note <strong>${grnNumber}</strong> has been approved.</p>
                        <div style="background-color: white; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>GRN Number:</strong> ${grnNumber}</p>
                            <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${grnData.totalAmount || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #4CAF50;">Approved</span></p>
                        </div>
                        <p>You can download the GRN PDF by clicking the button below:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${pdfLink}" 
                               style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                📄 Download GRN PDF
                            </a>
                        </div>
                        <p style="margin-top: 30px; color: #666; font-size: 12px;">
                            Or copy this link: <a href="${pdfLink}">${pdfLink}</a>
                        </p>
                        <p style="margin-top: 30px;">Thank you for your business.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
                            This is an automated email. Please do not reply.
                        </p>
                    </div>
                </div>
            `;

            const companyName = process.env.COMPANY_NAME || 'POS System';
            const senderName = `${companyName} <${process.env.EMAIL_USER}>`;

            const mailOptions = {
                from: senderName,
                to: supplierEmail,
                subject: `GRN Approved - ${grnNumber}`,
                html: htmlContent,
                attachments: [
                    {
                        filename: `${grnNumber}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ GRN email sent successfully to ${supplierEmail}`);

            if (emailLog) {
                await emailLog.update({
                    status: 'sent',
                    htmlContent,
                    gmailMessageId: info.messageId,
                    sentAt: new Date()
                });
            }

            return { success: true, messageId: info.messageId, recipient: supplierEmail };
        } catch (emailErr) {
            console.error('❌ Failed to send GRN email:', emailErr.message);
            if (emailLog) {
                await emailLog.update({
                    status: 'failed',
                    errorMessage: emailErr.message
                });
            }
            return { success: false, reason: 'send_failed', error: emailErr.message };
        }
    }

    /**
     * Send generic email (for notifications, birthdays, etc.)
     * @param {Object} emailOptions - { to, subject, html, text, attachments }
     */
    async sendEmail(emailOptions) {
        const { to, subject, html, text, attachments = [], from } = emailOptions;

        if (!to) {
            throw new Error('Recipient email address is required');
        }

        if (!subject) {
            throw new Error('Email subject is required');
        }

        if (!html && !text) {
            throw new Error('Email content (html or text) is required');
        }

        const transporter = this.getTransporter();
        if (!transporter) {
            throw new Error('Email transporter not configured - missing EMAIL_USER or EMAIL_PASS');
        }

        try {
            const companyName = process.env.COMPANY_NAME || 'POS System';
            const senderEmail = from || process.env.EMAIL_USER;
            const senderName = `${companyName} <${senderEmail}>`;

            const mailOptions = {
                from: senderName,
                to,
                subject,
                html: html || undefined,
                text: text || undefined,
                attachments: attachments.length > 0 ? attachments : undefined
            };

            console.log(`📧 Sending email to: ${to}`);
            console.log(`📧 Subject: ${subject}`);

            const info = await transporter.sendMail(mailOptions);
            
            console.log(`✅ Email sent successfully to ${to}`);
            console.log(`📧 Message ID: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId,
                recipient: to,
                sentAt: new Date()
            };
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error.message);
            throw error;
        }
    }

    /**
     * Verify email configuration
     */
    async verifyConnection() {
        const transporter = this.getTransporter();
        if (!transporter) {
            return { success: false, error: 'Email transporter not configured' };
        }

        try {
            await transporter.verify();
            console.log('✅ Email service connection verified');
            return { success: true, message: 'Email service is ready' };
        } catch (error) {
            console.error('❌ Email service verification failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
