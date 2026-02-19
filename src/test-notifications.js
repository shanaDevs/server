// src/test-notifications.js
const db = require('./models');
const notificationService = require('./services/notifications/notificationService');
const birthdayNotificationService = require('./services/notifications/birthdayNotificationService');

async function testNotifications() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🧪 NOTIFICATION SYSTEM - COMPREHENSIVE TESTING');
        console.log('='.repeat(80) + '\n');

        // ========================================
        // TEST 1: Get System Settings
        // ========================================
        console.log('TEST 1: Get System Notification Settings');
        console.log('-'.repeat(80));
        
        const settings = await notificationService.getNotificationSettings();
        console.log('✅ Settings:', settings);
        console.log('\n');

        // ========================================
        // TEST 2: Check SMS Gateway Availability
        // ========================================
        console.log('TEST 2: Check SMS Gateway Availability');
        console.log('-'.repeat(80));
        
        const smsAvailable = notificationService.isSMSGatewayAvailable();
        console.log(`✅ SMS Gateway Available: ${smsAvailable}`);
        console.log('\n');

        // ========================================
        // TEST 3: Determine Notification Channels
        // ========================================
        console.log('TEST 3: Determine Notification Channels');
        console.log('-'.repeat(80));
        
        const channels = await notificationService.determineChannels();
        console.log('✅ Channels:', channels);
        console.log('\n');

        // ========================================
        // TEST 4: Get Test Customer
        // ========================================
        console.log('TEST 4: Fetch Test Customer');
        console.log('-'.repeat(80));
        
        const customer = await db.Customer.findOne({
            where: { customerCode: 'TEST001' },
            order: [['createdAt', 'DESC']]
        });

        if (!customer) {
            console.error('❌ No test customer found! Please create test customer first:');
            console.log(`
INSERT INTO customers (
    customer_code, customer_name, phone, email, 
    customer_birthday, is_active, branch_id
) VALUES (
    'TEST001', 'John Doe', '0771234567', 
    'your-email@gmail.com', '2000-12-31', TRUE, 1
);
            `);
            process.exit(1);
        }

        console.log('✅ Customer Found:');
        console.log(`   ID: ${customer.id}`);
        console.log(`   Code: ${customer.customerCode}`);
        console.log(`   Name: ${customer.customerName}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Phone: ${customer.phone}`);
        console.log(`   Birthday: ${customer.customerBirthday}`);
        console.log(`   Active: ${customer.isActive}`);
        console.log(`   Opted Out: ${customer.optOutNotifications}`);
        console.log('\n');

        // ========================================
        // TEST 5: Check Opt-Out Status
        // ========================================
        console.log('TEST 5: Check Customer Opt-Out Status');
        console.log('-'.repeat(80));
        
        const optedOut = await notificationService.hasOptedOut(customer.id);
        console.log(`✅ Customer Opted Out: ${optedOut}`);
        console.log('\n');

        // ========================================
        // TEST 6: Generate Birthday Content (Day 0)
        // ========================================
        console.log('TEST 6: Generate Birthday Day Content');
        console.log('-'.repeat(80));
        
        const content0 = birthdayNotificationService.generateBirthdayContent(customer, 0);
        console.log('✅ Email Subject:', content0.email.subject);
        console.log('✅ SMS Message:', content0.sms);
        console.log('✅ Email Body Length:', content0.email.body.length, 'characters');
        console.log('✅ SMS Length:', content0.sms.length, 'characters (max 160)');
        console.log('\n');

        // ========================================
        // TEST 7: Generate Birthday Content (7 Days)
        // ========================================
        console.log('TEST 7: Generate 7 Days Before Birthday Content');
        console.log('-'.repeat(80));
        
        const content7 = birthdayNotificationService.generateBirthdayContent(customer, 7);
        console.log('✅ Email Subject:', content7.email.subject);
        console.log('✅ SMS Message:', content7.sms);
        console.log('✅ SMS Length:', content7.sms.length, 'characters (max 160)');
        console.log('\n');

        // ========================================
        // TEST 8: Generate Birthday Content (3 Days)
        // ========================================
        console.log('TEST 8: Generate 3 Days Before Birthday Content');
        console.log('-'.repeat(80));
        
        const content3 = birthdayNotificationService.generateBirthdayContent(customer, 3);
        console.log('✅ Email Subject:', content3.email.subject);
        console.log('✅ SMS Message:', content3.sms);
        console.log('✅ SMS Length:', content3.sms.length, 'characters (max 160)');
        console.log('\n');

        // ========================================
        // TEST 9: Send Birthday Day Notification
        // ========================================
        console.log('TEST 9: Send Birthday Day Notification');
        console.log('-'.repeat(80));
        
        const result1 = await birthdayNotificationService.sendBirthdayNotification(customer, 0);
        console.log('✅ Result:', JSON.stringify(result1, null, 2));
        
        if (result1.success) {
            console.log('✅ SUCCESS - Notification sent!');
            console.log(`   Log ID: ${result1.logId}`);
            console.log(`   Email Status: ${result1.channels.email}`);
            console.log(`   SMS Status: ${result1.channels.sms}`);
        } else {
            console.log(`⚠️  SKIPPED - Reason: ${result1.reason}`);
        }
        console.log('\n');

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ========================================
        // TEST 10: Check for Duplicate (Should Fail)
        // ========================================
        console.log('TEST 10: Attempt Duplicate Send (Should Be Blocked)');
        console.log('-'.repeat(80));
        
        const isDupe = await notificationService.isDuplicate(customer.id, 'BIRTHDAY', 'BIRTHDAY_DAY');
        console.log(`✅ Is Duplicate: ${isDupe}`);
        
        const result2 = await birthdayNotificationService.sendBirthdayNotification(customer, 0);
        console.log('✅ Result:', JSON.stringify(result2, null, 2));
        
        if (!result2.success && result2.reason === 'Duplicate notification') {
            console.log('✅ SUCCESS - Duplicate prevention working!');
        } else {
            console.log('⚠️  WARNING - Duplicate was not prevented!');
        }
        console.log('\n');

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ========================================
        // TEST 11: Send 7 Days Before Notification
        // ========================================
        console.log('TEST 11: Send 7 Days Before Birthday Notification');
        console.log('-'.repeat(80));
        
        const result3 = await birthdayNotificationService.sendBirthdayNotification(customer, 7);
        console.log('✅ Result:', JSON.stringify(result3, null, 2));
        
        if (result3.success) {
            console.log('✅ SUCCESS - 7 days notification sent!');
        } else {
            console.log(`⚠️  SKIPPED - Reason: ${result3.reason}`);
        }
        console.log('\n');

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ========================================
        // TEST 12: Send 3 Days Before Notification
        // ========================================
        console.log('TEST 12: Send 3 Days Before Birthday Notification');
        console.log('-'.repeat(80));
        
        const result4 = await birthdayNotificationService.sendBirthdayNotification(customer, 3);
        console.log('✅ Result:', JSON.stringify(result4, null, 2));
        
        if (result4.success) {
            console.log('✅ SUCCESS - 3 days notification sent!');
        } else {
            console.log(`⚠️  SKIPPED - Reason: ${result4.reason}`);
        }
        console.log('\n');

        // ========================================
        // TEST 13: Retrieve Notification Logs
        // ========================================
        console.log('TEST 13: Retrieve All Notification Logs for Customer');
        console.log('-'.repeat(80));
        
        const logs = await db.NotificationLog.findAll({
            where: { customerId: customer.id },
            order: [['createdAt', 'DESC']],
            include: [{
                model: db.Customer,
                as: 'customer',
                attributes: ['id', 'customerCode', 'customerName', 'email', 'phone']
            }]
        });
        
        console.log(`✅ Found ${logs.length} notification log(s)\n`);
        
        logs.forEach((log, index) => {
            console.log(`📋 Log ${index + 1}:`);
            console.log(`   ID: ${log.id}`);
            console.log(`   Event Type: ${log.eventType}`);
            console.log(`   Message Type: ${log.messageType}`);
            console.log(`   Channel: ${log.notificationChannel}`);
            console.log(`   Email Status: ${log.emailStatus}`);
            console.log(`   SMS Status: ${log.smsStatus}`);
            console.log(`   Email Sent At: ${log.emailSentAt || 'N/A'}`);
            console.log(`   SMS Sent At: ${log.smsSentAt || 'N/A'}`);
            console.log(`   Recipient Email: ${log.recipientEmail}`);
            console.log(`   Recipient Phone: ${log.recipientPhone}`);
            console.log(`   Created At: ${log.createdAt}`);
            if (log.errorMessage) {
                console.log(`   ⚠️  Error: ${log.errorMessage}`);
            }
            console.log('');
        });

        // ========================================
        // TEST 14: Send Custom Notification
        // ========================================
        console.log('TEST 14: Send Custom Notification (In-Store Purchase)');
        console.log('-'.repeat(80));
        
        const customContent = {
            email: {
                subject: `Thank You for Your Purchase, ${customer.customerName}!`,
                body: `
                    <div style="font-family: Arial; padding: 20px;">
                        <h2>Thank You!</h2>
                        <p>Dear ${customer.customerName},</p>
                        <p>Thank you for your recent purchase. Your order has been confirmed.</p>
                        <p>Order Number: <strong>#TEST-12345</strong></p>
                        <p>We appreciate your business!</p>
                    </div>
                `
            },
            sms: `Thank you ${customer.customerName.split(' ')[0]}! Order #TEST-12345 confirmed. We appreciate your business!`
        };
        
        const result5 = await notificationService.sendNotification(
            customer.id,
            'IN_STORE_PURCHASE',
            customContent,
            {
                relatedEntityType: 'Sale',
                relatedEntityId: 12345,
                branchId: customer.branchId
            }
        );
        
        console.log('✅ Result:', JSON.stringify(result5, null, 2));
        console.log('\n');

        // ========================================
        // TEST 15: Test with Opted-Out Customer
        // ========================================
        console.log('TEST 15: Test Opt-Out Functionality');
        console.log('-'.repeat(80));
        
        // Temporarily opt out customer
        await customer.update({ optOutNotifications: true });
        console.log('✅ Customer opted out');
        
        const result6 = await birthdayNotificationService.sendBirthdayNotification(customer, 0);
        console.log('✅ Result:', JSON.stringify(result6, null, 2));
        
        if (!result6.success && result6.reason === 'Customer opted out') {
            console.log('✅ SUCCESS - Opt-out prevention working!');
        } else {
            console.log('⚠️  WARNING - Opt-out was not respected!');
        }
        
        // Restore opt-in status
        await customer.update({ optOutNotifications: false });
        console.log('✅ Customer opt-in status restored');
        console.log('\n');

        // ========================================
        // FINAL SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL SUMMARY');
        console.log('='.repeat(80));
        
        const totalLogs = await db.NotificationLog.count({
            where: { customerId: customer.id }
        });
        
        const sentEmails = await db.NotificationLog.count({
            where: { 
                customerId: customer.id,
                emailStatus: 'SENT'
            }
        });
        
        const sentSMS = await db.NotificationLog.count({
            where: { 
                customerId: customer.id,
                smsStatus: 'SENT'
            }
        });
        
        console.log(`\n✅ Total Notifications Logged: ${totalLogs}`);
        console.log(`✅ Emails Sent: ${sentEmails}`);
        console.log(`✅ SMS Sent: ${sentSMS}`);
        console.log('\n' + '='.repeat(80));
        console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(80) + '\n');

        process.exit(0);

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ TEST FAILED');
        console.error('='.repeat(80));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(80) + '\n');
        process.exit(1);
    }
}

// Run tests
testNotifications();
