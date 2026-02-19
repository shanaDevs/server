// Quick cleanup script for birthday notifications
require('dotenv').config();
const db = require('./src/models');

async function cleanup() {
    try {
        console.log('🧹 Cleaning up birthday notifications for customer 1...\n');
        
        // Delete all birthday notifications for customer 1
        const deleted = await db.NotificationLog.destroy({
            where: {
                customerId: 1,
                eventType: 'BIRTHDAY'
            }
        });
        
        console.log(`✅ Deleted ${deleted} birthday notification(s)\n`);
        console.log('🎉 Ready to send fresh birthday email!\n');
        console.log('The birthday cron will now send the email in the next run.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanup();
