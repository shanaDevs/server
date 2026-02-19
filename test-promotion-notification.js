// test-promotion-notification.js
// Quick test script for promotion notification system
require('dotenv').config();
const db = require('./src/models');
const promotionNotificationService = require('./src/services/promotion/promotionNotificationService');
const promotionEmailService = require('./src/services/emails/promotionEmailService');

async function testPromotionNotification() {
    console.log('🧪 Testing Promotion Notification System\n');
    
    try {
        // 1. Check database connection
        console.log('1️⃣ Testing database connection...');
        await db.sequelize.authenticate();
        console.log('✅ Database connected\n');

        // 2. Check environment variables
        console.log('2️⃣ Checking environment variables...');
        console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
        console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
        console.log(`   TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '⚠️ Not set (SMS disabled)'}`);
        console.log(`   COMPANY_NAME: ${process.env.COMPANY_NAME || '⚠️ Using default'}`);
        console.log('');

        // 3. Check email transporter
        console.log('3️⃣ Testing email service...');
        const transporter = promotionEmailService.getTransporter();
        if (transporter) {
            console.log('✅ Email transporter initialized\n');
        } else {
            console.log('❌ Email transporter not available. Check EMAIL_USER and EMAIL_PASS\n');
        }

        // 4. Check customers
        console.log('4️⃣ Checking customer data...');
        const customersWithEmail = await promotionNotificationService.getCustomersWithEmail();
        const customersWithPhone = await promotionNotificationService.getCustomersWithPhone();
        
        console.log(`   Total customers with email: ${customersWithEmail.length}`);
        console.log(`   Total customers with phone: ${customersWithPhone.length}`);
        
        if (customersWithEmail.length === 0) {
            console.log('   ⚠️ No customers with email addresses found!');
            console.log('   💡 Add email addresses to customer records to enable email notifications\n');
        } else {
            console.log('   ✅ Ready to send email notifications\n');
            
            // Show sample customer
            const sample = customersWithEmail[0];
            console.log(`   Sample customer: ${sample.customerName} (${sample.email})\n`);
        }

        // 5. Check promotions
        console.log('5️⃣ Checking existing promotions...');
        const promotions = await db.Promotion.findAll({
            where: { isActive: true },
            limit: 3
        });
        
        console.log(`   Active promotions: ${promotions.length}`);
        
        if (promotions.length > 0) {
            promotions.forEach((promo, index) => {
                console.log(`   ${index + 1}. ${promo.promotionName} (ID: ${promo.id})${promo.couponCode ? ` - Code: ${promo.couponCode}` : ''}`);
            });
            console.log('');
        }

        // 6. Test barcode generation (if coupon code exists)
        const promoWithCoupon = promotions.find(p => p.couponCode);
        if (promoWithCoupon) {
            console.log('6️⃣ Testing barcode generation...');
            const barcodeGenerator = require('./src/utils/barcodeGenerator');
            try {
                const barcode = await barcodeGenerator.generateBarcode(promoWithCoupon.couponCode);
                console.log(`   ✅ Barcode generated for: ${promoWithCoupon.couponCode} (${barcode.length} bytes)\n`);
            } catch (error) {
                console.log(`   ❌ Barcode generation failed: ${error.message}\n`);
            }
        }

        // 7. Check notification logs
        console.log('7️⃣ Checking notification logs...');
        const recentLogs = await db.NotificationLog.findAll({
            where: { eventType: 'PROMOTION' },
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        console.log(`   Recent promotion notifications: ${recentLogs.length}`);
        if (recentLogs.length > 0) {
            recentLogs.forEach((log, index) => {
                console.log(`   ${index + 1}. ${log.channel} - ${log.status} (${new Date(log.createdAt).toLocaleString()})`);
            });
        }
        console.log('');

        // 8. Summary
        console.log('📊 Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const readyToSend = transporter && customersWithEmail.length > 0;
        
        if (readyToSend) {
            console.log('✅ System is ready to send promotion notifications!');
            console.log(`   - ${customersWithEmail.length} customers will receive emails`);
            if (customersWithPhone.length > 0 && process.env.TWILIO_ACCOUNT_SID) {
                console.log(`   - ${customersWithPhone.length} customers can receive SMS`);
            }
            console.log('\n💡 To test, create a new promotion via API:');
            console.log('   POST /api/promotions');
            console.log('\n💡 Or send notifications for existing promotion:');
            if (promotions.length > 0) {
                console.log(`   POST /api/promotions/${promotions[0].id}/send-notifications`);
            }
        } else {
            console.log('⚠️ System needs configuration:');
            if (!transporter) {
                console.log('   ❌ Email service not configured (set EMAIL_USER and EMAIL_PASS)');
            }
            if (customersWithEmail.length === 0) {
                console.log('   ❌ No customers with email addresses');
            }
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await db.sequelize.close();
        console.log('✅ Test complete');
    }
}

// Run test
testPromotionNotification();
