// Test email sending directly
require('dotenv').config();
const db = require('./src/models');
const emailService = require('./src/services/emails/emailService');
const notificationService = require('./src/services/notifications/notificationService');

async function testEmailSend() {
    try {
        console.log('\n========== EMAIL SEND TEST ==========\n');
        
        // 1. Check notification logs
        console.log('1. Checking recent birthday notifications...');
        const recentLogs = await db.NotificationLog.findAll({
            where: {
                customerId: 1,
                eventType: 'BIRTHDAY'
            },
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        console.log(`Found ${recentLogs.length} birthday notification(s):`);
        recentLogs.forEach(log => {
            console.log(`  - ID ${log.id}: ${log.messageType}, ${log.notificationChannel}, Email: ${log.emailStatus}, Created: ${log.createdAt}`);
        });
        
        // 2. Check email configuration
        console.log('\n2. Checking email configuration...');
        console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
        console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '****' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET'}`);
        console.log(`COMPANY_NAME: ${process.env.COMPANY_NAME || 'Not set'}`);
        
        // 3. Verify email service
        console.log('\n3. Verifying email service connection...');
        const verifyResult = await emailService.verifyConnection();
        console.log('Verification result:', verifyResult);
        
        // 4. Get customer
        console.log('\n4. Getting customer data...');
        const customer = await db.Customer.findOne({ where: { id: 1 } });
        console.log(`Customer: ${customer.customerName}`);
        console.log(`Email: ${customer.email}`);
        
        // 5. Test send email directly
        console.log('\n5. Testing direct email send...');
        const testResult = await emailService.sendEmail({
            to: customer.email,
            subject: 'Test Birthday Email from POS System',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Test Email - Birthday Notification System</h2>
                    <p>Hi ${customer.customerName}!</p>
                    <p>This is a test email to verify the birthday notification system is working.</p>
                    <p>If you receive this, the email service is configured correctly! 🎉</p>
                    <p>Best regards,<br/>POS System Team</p>
                </div>
            `
        });
        
        console.log('\n✅ Email sent successfully!');
        console.log('Result:', testResult);
        
        // 6. Delete old notifications to allow re-testing
        console.log('\n6. Cleaning up old birthday notifications (for testing)...');
        const deleted = await db.NotificationLog.destroy({
            where: {
                customerId: 1,
                eventType: 'BIRTHDAY',
                messageType: 'BIRTHDAY_DAY'
            }
        });
        console.log(`Deleted ${deleted} old birthday notification(s)`);
        
        console.log('\n========== TEST COMPLETE ==========');
        console.log('✅ You can now run the birthday cron again to send the actual birthday email!');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Error stack:', error.stack);
        process.exit(1);
    }
}

testEmailSend();
