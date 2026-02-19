/**
 * Test script to verify sale email functionality
 * Run with: node test-sale-email.js
 */

require('dotenv').config();
const emailService = require('./src/services/emails/emailService');

async function testEmailConfiguration() {
    console.log('=================================================');
    console.log('📧 Testing Email Configuration for Sale Receipts');
    console.log('=================================================\n');

    // Check environment variables
    console.log('1️⃣ Checking Email Credentials...');
    console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
    console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set');
    console.log('   BASE_URL:', process.env.BASE_URL || 'http://localhost:3000 (default)');
    console.log('   COMPANY_NAME:', process.env.COMPANY_NAME || 'POS System (default)');
    console.log('');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('❌ EMAIL CONFIGURATION MISSING!');
        console.log('\n📝 To fix this, add these to your .env file:');
        console.log('   EMAIL_USER=your-email@gmail.com');
        console.log('   EMAIL_PASS=your-app-password');
        console.log('\n💡 For Gmail, you need to generate an App Password:');
        console.log('   1. Go to https://myaccount.google.com/security');
        console.log('   2. Enable 2-Step Verification (if not already enabled)');
        console.log('   3. Go to https://myaccount.google.com/apppasswords');
        console.log('   4. Generate a new app password for "Mail"');
        console.log('   5. Copy the 16-character password and use it as EMAIL_PASS');
        console.log('');
        return;
    }

    // Test email connection
    console.log('2️⃣ Testing Email Connection...');
    try {
        const verifyResult = await emailService.verifyConnection();
        if (verifyResult.success) {
            console.log('   ✅ Email service connection verified successfully!');
        } else {
            console.log('   ❌ Email verification failed:', verifyResult.error);
            console.log('\n💡 Common issues:');
            console.log('   - Wrong email or password');
            console.log('   - 2-Step Verification not enabled for Gmail');
            console.log('   - Need to use App Password instead of regular password');
            console.log('   - Firewall or network blocking port 587/465');
            return;
        }
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return;
    }

    // Send test email
    console.log('\n3️⃣ Sending Test Email...');
    console.log('   Enter recipient email (or press Ctrl+C to skip):');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('   Recipient email: ', async (email) => {
        if (!email || !email.includes('@')) {
            console.log('   ⏭️  Skipping test email (no valid email provided)');
            rl.close();
            console.log('\n✅ Email configuration test complete!');
            return;
        }

        try {
            const testResult = await emailService.sendEmail({
                to: email,
                subject: '🧪 Test Email from POS System',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>✅ Email Test Successful!</h2>
                        <p>This is a test email from your POS system.</p>
                        <p>If you received this, your email configuration is working correctly!</p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            Sent at: ${new Date().toLocaleString()}
                        </p>
                    </div>
                `
            });

            console.log('   ✅ Test email sent successfully!');
            console.log('   📧 Recipient:', email);
            console.log('   🆔 Message ID:', testResult.messageId);
        } catch (error) {
            console.log('   ❌ Failed to send test email:', error.message);
        }

        rl.close();
        console.log('\n✅ Email configuration test complete!');
    });
}

// Run the test
testEmailConfiguration().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
