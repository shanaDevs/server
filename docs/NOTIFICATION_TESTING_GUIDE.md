# Notification System Testing Guide

## Step-by-Step Testing Instructions

---

## 📋 Prerequisites

1. Server running (`npm run dev`)
2. Database connected
3. Twilio credentials in `.env` (optional for testing mode)
4. Email credentials in `.env`

---

## 🗄️ STEP 1: Create Database Tables

### 1.1 Create `notification_logs` Table

```sql
USE pos_db;

CREATE TABLE IF NOT EXISTS notification_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    event_type ENUM('IN_STORE_PURCHASE', 'ONLINE_ORDER', 'BIRTHDAY', 'PROMOTION') NOT NULL,
    notification_channel ENUM('EMAIL', 'SMS', 'BOTH') NOT NULL,
    message_type VARCHAR(50),
    
    email_status ENUM('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE') DEFAULT 'NOT_APPLICABLE',
    sms_status ENUM('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE') DEFAULT 'NOT_APPLICABLE',
    
    email_sent_at DATETIME,
    sms_sent_at DATETIME,
    
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    
    email_content TEXT,
    sms_content TEXT,
    
    error_message TEXT,
    
    related_entity_type VARCHAR(50),
    related_entity_id INT,
    
    branch_id INT,
    sent_by INT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer_id (customer_id),
    INDEX idx_event_type (event_type),
    INDEX idx_message_type (message_type),
    INDEX idx_created_at (created_at),
    INDEX idx_customer_event (customer_id, message_type, created_at),
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.2 Add Notification Columns to System Settings

```sql
ALTER TABLE system_settings 
ADD COLUMN notification_channel ENUM('EMAIL_ONLY', 'SMS_ONLY', 'EMAIL_AND_SMS') DEFAULT 'EMAIL_ONLY' 
COMMENT 'Preferred channel for customer notifications',
ADD COLUMN enable_email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN enable_sms_notifications BOOLEAN DEFAULT FALSE;
```

### 1.3 Add Opt-Out Column to Customers

```sql
ALTER TABLE customers 
ADD COLUMN opt_out_notifications BOOLEAN DEFAULT FALSE 
COMMENT 'Customer has opted out of marketing notifications';
```

### 1.4 Verify Tables Created

```sql
SHOW TABLES LIKE '%notification%';
DESCRIBE notification_logs;
DESCRIBE system_settings;
DESCRIBE customers;
```

---

## ⚙️ STEP 2: Configure System Settings

### 2.1 Set Notification Channel

**Option A: EMAIL_ONLY (Safest for Testing)**
```sql
UPDATE system_settings 
SET notification_channel = 'EMAIL_ONLY',
    enable_email_notifications = TRUE,
    enable_sms_notifications = FALSE;
```

**Option B: SMS_ONLY**
```sql
UPDATE system_settings 
SET notification_channel = 'SMS_ONLY',
    enable_email_notifications = FALSE,
    enable_sms_notifications = TRUE;
```

**Option C: EMAIL_AND_SMS (Both)**
```sql
UPDATE system_settings 
SET notification_channel = 'EMAIL_AND_SMS',
    enable_email_notifications = TRUE,
    enable_sms_notifications = TRUE;
```

### 2.2 Verify Settings

```sql
SELECT notification_channel, enable_email_notifications, enable_sms_notifications 
FROM system_settings;
```

---

## 👤 STEP 3: Create Test Customers

### 3.1 Customer with Birthday TODAY

```sql
INSERT INTO customers (
    customer_code, 
    customer_name, 
    phone, 
    email, 
    customer_birthday, 
    is_active, 
    branch_id,
    created_at
) VALUES (
    'TEST001',
    'John Doe',
    '0771234567',
    'your-test-email@gmail.com',  -- Change this to YOUR email
    '2000-12-31',  -- Birthday TODAY (Dec 31)
    TRUE,
    1,
    NOW()
);
```

### 3.2 Customer with Birthday in 3 DAYS

```sql
-- If today is Dec 31, birthday should be Jan 3
INSERT INTO customers (
    customer_code, 
    customer_name, 
    phone, 
    email, 
    customer_birthday, 
    is_active, 
    branch_id
) VALUES (
    'TEST002',
    'Jane Smith',
    '0772345678',
    'your-test-email@gmail.com',
    '2001-01-03',  -- 3 days from Dec 31
    TRUE,
    1
);
```

### 3.3 Customer with Birthday in 7 DAYS

```sql
-- If today is Dec 31, birthday should be Jan 7
INSERT INTO customers (
    customer_code, 
    customer_name, 
    phone, 
    email, 
    customer_birthday, 
    is_active, 
    branch_id
) VALUES (
    'TEST003',
    'Bob Johnson',
    '0773456789',
    'your-test-email@gmail.com',
    '1999-01-07',  -- 7 days from Dec 31
    TRUE,
    1
);
```

### 3.4 Verify Test Customers

```sql
SELECT id, customer_code, customer_name, email, phone, customer_birthday, is_active
FROM customers 
WHERE customer_code LIKE 'TEST%';
```

---

## 🧪 STEP 4: Enable Testing Mode

### 4.1 Open SMS Service File
```bash
# Edit: src/services/SMS/smsService.js
```

Find this line:
```javascript
const TESTING_MODE = false;
```

Change to:
```javascript
const TESTING_MODE = true;  // ✅ Enables mock SMS (no real Twilio calls)
```

This will simulate SMS sends without actually calling Twilio API.

---

## 🚀 STEP 5: Test Notification Service Directly

### 5.1 Create Test Script

Create file: `src/test-notifications.js`

```javascript
const db = require('./models');
const notificationService = require('./services/notifications/notificationService');
const birthdayNotificationService = require('./services/notifications/birthdayNotificationService');

async function testNotifications() {
    try {
        console.log('🧪 Starting Notification Tests\n');

        // Get test customer
        const customer = await db.Customer.findOne({
            where: { customerCode: 'TEST001' }
        });

        if (!customer) {
            console.error('❌ Test customer TEST001 not found!');
            return;
        }

        console.log('✅ Found customer:', customer.customerName);
        console.log('📧 Email:', customer.email);
        console.log('📱 Phone:', customer.phone);
        console.log('🎂 Birthday:', customer.customerBirthday);
        console.log('\n' + '='.repeat(60) + '\n');

        // TEST 1: Birthday Day Notification
        console.log('TEST 1: Sending BIRTHDAY DAY notification...\n');
        const result1 = await birthdayNotificationService.sendBirthdayNotification(customer, 0);
        console.log('Result:', JSON.stringify(result1, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // TEST 2: Try to send duplicate (should be blocked)
        console.log('TEST 2: Trying to send DUPLICATE (should be blocked)...\n');
        const result2 = await birthdayNotificationService.sendBirthdayNotification(customer, 0);
        console.log('Result:', JSON.stringify(result2, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // TEST 3: 7 Days Before Birthday
        console.log('TEST 3: Sending 7 DAYS BEFORE notification...\n');
        const result3 = await birthdayNotificationService.sendBirthdayNotification(customer, 7);
        console.log('Result:', JSON.stringify(result3, null, 2));
        console.log('\n' + '='.repeat(60) + '\n');

        // TEST 4: Check notification logs
        console.log('TEST 4: Checking notification logs...\n');
        const logs = await db.NotificationLog.findAll({
            where: { customerId: customer.id },
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        console.log(`Found ${logs.length} notification logs:`);
        logs.forEach(log => {
            console.log(`\n📋 Log ID: ${log.id}`);
            console.log(`   Event: ${log.eventType}`);
            console.log(`   Message Type: ${log.messageType}`);
            console.log(`   Channel: ${log.notificationChannel}`);
            console.log(`   Email Status: ${log.emailStatus}`);
            console.log(`   SMS Status: ${log.smsStatus}`);
            console.log(`   Created: ${log.createdAt}`);
        });

        console.log('\n✅ All tests completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testNotifications();
```

### 5.2 Run Test Script

```bash
node src/test-notifications.js
```

**Expected Output:**
```
🧪 Starting Notification Tests

✅ Found customer: John Doe
📧 Email: your-test-email@gmail.com
📱 Phone: 0771234567
🎂 Birthday: 2000-12-31

============================================================

TEST 1: Sending BIRTHDAY DAY notification...

Result: {
  "success": true,
  "logId": 1,
  "channels": {
    "email": "SENT",
    "sms": "NOT_SENT"
  }
}

============================================================

TEST 2: Trying to send DUPLICATE (should be blocked)...

Result: {
  "success": false,
  "reason": "Duplicate notification"
}

============================================================

TEST 3: Sending 7 DAYS BEFORE notification...

Result: {
  "success": true,
  "logId": 2,
  "channels": {
    "email": "SENT",
    "sms": "NOT_SENT"
  }
}

============================================================

✅ All tests completed!
```

---

## 🕐 STEP 6: Test Birthday Cron Job

### 6.1 Enable Testing Mode (Every Minute)

Open `src/controllers/SMS/birthdayCron.js`

Find this line:
```javascript
cron.schedule('0 9 * * *', async () => {
```

Change to:
```javascript
cron.schedule('* * * * *', async () => {  // ✅ Every minute for testing
```

### 6.2 Restart Server

```bash
npm run dev
```

### 6.3 Watch Console Output

You should see output every minute:
```
🎂 BIRTHDAY NOTIFICATION CRON STARTED
⏰ Time: 12/31/2025, 11:00:00 AM

🔍 Checking for birthdays in 7 days...
✅ Found 1 customer(s)

👤 Bob Johnson (TEST003)
   📧 Email: your-test-email@gmail.com
   📱 Phone: 0773456789
   🎂 Birthday: 1999-01-07T00:00:00.000Z
   ✅ Notification sent via {"email":"SENT","sms":"NOT_SENT"}

🔍 Checking for birthdays in 3 days...
✅ Found 1 customer(s)

👤 Jane Smith (TEST002)
   ✅ Notification sent via {"email":"SENT","sms":"NOT_SENT"}

🔍 Checking for birthdays today...
✅ Found 1 customer(s)

👤 John Doe (TEST001)
   ⏭️  Skipped: Duplicate notification

📊 SUMMARY
   7 Days: Processed=1 | ✅ 1 | ❌ 0
   3 Days: Processed=1 | ✅ 1 | ❌ 0
   Today: Processed=1 | ✅ 0 | ❌ 0
```

---

## 📊 STEP 7: Verify Results in Database

### 7.1 Check Notification Logs

```sql
SELECT 
    nl.id,
    c.customer_name,
    nl.event_type,
    nl.message_type,
    nl.notification_channel,
    nl.email_status,
    nl.sms_status,
    nl.created_at
FROM notification_logs nl
JOIN customers c ON nl.customer_id = c.id
ORDER BY nl.created_at DESC
LIMIT 10;
```

### 7.2 Check Email Sent Counts

```sql
SELECT 
    message_type,
    COUNT(*) as total,
    SUM(CASE WHEN email_status = 'SENT' THEN 1 ELSE 0 END) as email_sent,
    SUM(CASE WHEN sms_status = 'SENT' THEN 1 ELSE 0 END) as sms_sent
FROM notification_logs
WHERE event_type = 'BIRTHDAY'
GROUP BY message_type;
```

### 7.3 Check Failed Notifications

```sql
SELECT * FROM notification_logs
WHERE email_status = 'FAILED' OR sms_status = 'FAILED'
ORDER BY created_at DESC;
```

---

## 📧 STEP 8: Check Your Email Inbox

1. Open your email (the one you used in test customers)
2. Look for emails with subjects:
   - "🎉 Happy Birthday John!" (Birthday day)
   - "John, Your Special Day is Coming! 🎂" (7 days before)
   - "John, It's Almost Your Birthday! 🎁" (3 days before)
3. Verify the content and promo codes

---

## 🧹 STEP 9: Clean Up Test Data

### 9.1 Delete Test Notifications

```sql
DELETE FROM notification_logs 
WHERE customer_id IN (
    SELECT id FROM customers WHERE customer_code LIKE 'TEST%'
);
```

### 9.2 Delete Test Customers

```sql
DELETE FROM customers WHERE customer_code LIKE 'TEST%';
```

### 9.3 Reset Cron Schedule (Production Mode)

Open `src/controllers/SMS/birthdayCron.js`

Change back to:
```javascript
cron.schedule('0 9 * * *', async () => {  // ✅ 9 AM daily for production
```

---

## 🔧 STEP 10: Test Different Scenarios

### Test 10.1: Opt-Out Customer

```sql
-- Mark customer as opted out
UPDATE customers 
SET opt_out_notifications = TRUE 
WHERE customer_code = 'TEST001';

-- Try to send notification (should be blocked)
```

Then run the test script again. You should see:
```
⛔ Customer 1 has opted out of notifications
```

### Test 10.2: SMS Only Mode

```sql
UPDATE system_settings 
SET notification_channel = 'SMS_ONLY';
```

Restart server and check logs - should show SMS being sent (or simulated in testing mode).

### Test 10.3: Both Email and SMS

```sql
UPDATE system_settings 
SET notification_channel = 'EMAIL_AND_SMS';
```

Should send both email and SMS.

### Test 10.4: Customer Without Email

```sql
UPDATE customers 
SET email = NULL 
WHERE customer_code = 'TEST001';
```

Should skip email but still work (or fallback to SMS if configured).

---

## ✅ Success Checklist

- [ ] `notification_logs` table created
- [ ] System settings updated with notification preferences
- [ ] Test customers created with different birthday dates
- [ ] Testing mode enabled in SMS service
- [ ] Direct notification test successful
- [ ] Cron job running and detected test customers
- [ ] Notifications logged in database
- [ ] Email received in inbox
- [ ] Duplicate prevention working
- [ ] Opt-out logic working
- [ ] Channel switching working (EMAIL_ONLY, SMS_ONLY, BOTH)

---

## 🐛 Troubleshooting

### Issue: "Table notification_logs doesn't exist"
**Solution**: Run STEP 1.1 SQL script

### Issue: "Customer not found"
**Solution**: Run STEP 3 SQL scripts to create test customers

### Issue: No emails received
**Check**:
- EMAIL_USER and EMAIL_PASS in .env
- Email address in test customer is correct
- Check spam folder
- Check server logs for errors

### Issue: Cron not running
**Check**:
- Birthday cron file is being loaded
- Server restarted after changes
- Check console for "✅ Birthday notification cron scheduled" message

### Issue: "Duplicate notification" on first run
**Solution**: Delete existing logs for that customer:
```sql
DELETE FROM notification_logs WHERE customer_id = 1;
```

---

**Happy Testing! 🎉**
