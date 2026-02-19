# Customer Notification System

## Overview
Automated customer notification system supporting **EMAIL**, **SMS**, and **BOTH** channels based on system settings.

## Supported Event Types

### 1. In-Store Purchase
- **Trigger**: POS "Complete Sale" confirmation
- **Purpose**: Transaction confirmation
- **Timing**: Immediate

### 2. Online Order
- **Trigger**: Courier or delivery status update
- **Purpose**: Order tracking update
- **Timing**: Real-time on status change

### 3. Birthday Notifications (Scheduled)
- **Trigger**: Automated cron job (daily at 9:00 AM)
- **Purpose**: Customer engagement & loyalty
- **Schedule**:
  - ✉️ **7 days before birthday** - Early reminder with 15% OFF code (BDAY15)
  - ✉️ **3 days before birthday** - Follow-up reminder
  - ✉️ **On birthday day** - Birthday wishes with 20% OFF code (BDAY20)

### 4. Promotions
- **Trigger**: Manual bulk send via CRM
- **Purpose**: Marketing campaigns
- **Timing**: On-demand

---

## System Settings

### Notification Channel Options

Configure in **System Settings** > `notificationChannel`:

```javascript
{
  notificationChannel: 'EMAIL_ONLY' | 'SMS_ONLY' | 'EMAIL_AND_SMS'
}
```

#### EMAIL_ONLY
- Sends notifications via EMAIL only
- Default setting (safest option)

#### SMS_ONLY  
- Sends notifications via SMS only
- **Auto-fallback**: If SMS gateway unavailable → sends EMAIL instead

#### EMAIL_AND_SMS
- Sends both EMAIL and SMS
- **Auto-fallback**: If SMS gateway unavailable → sends EMAIL only

---

## SMS Gateway Availability

### Automatic Fallback Logic
```
IF (SMS_ONLY OR EMAIL_AND_SMS selected) AND (SMS gateway not configured)
  → Automatically fallback to EMAIL_ONLY
  → Log SMS status as "NOT_APPLICABLE"
  → Never fail the notification
```

### SMS Gateway Configuration
Required environment variables:
```env
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_PHONE=+19705925636
```

---

## Notification Content Rules

### SMS Rules
- ✅ Maximum 160 characters
- ✅ Personalized with customer first name
- ✅ Includes promo codes when applicable
- ✅ Clear call-to-action

### Email Rules
- ✅ Subject line personalized
- ✅ HTML formatted
- ✅ Professional design
- ✅ Clear call-to-action
- ✅ Includes company branding

### Tone Guidelines
- **Transactional** (Purchase/Order): Professional, clear, informative
- **Birthday/Promotions**: Friendly, engaging, warm

---

## Safety & Validation

### Duplicate Prevention
- Tracks sent notifications in `notification_logs` table
- Prevents duplicate sends within 24 hours
- Each birthday notification type sent only once

### Opt-Out Support
- Customers can opt out via `opt_out_notifications` flag
- System automatically skips opted-out customers
- Applies to ALL notification types

### Required Data Validation
- Email notifications require valid email address
- SMS notifications require valid phone number
- Skips customer if required data missing

---

## Database Schema

### NotificationLog Table
```sql
CREATE TABLE notification_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  event_type ENUM('IN_STORE_PURCHASE', 'ONLINE_ORDER', 'BIRTHDAY', 'PROMOTION'),
  notification_channel ENUM('EMAIL', 'SMS', 'BOTH'),
  message_type VARCHAR(50), -- e.g., BIRTHDAY_7_DAYS, BIRTHDAY_3_DAYS, BIRTHDAY_DAY
  
  email_status ENUM('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'),
  sms_status ENUM('PENDING', 'SENT', 'FAILED', 'NOT_APPLICABLE'),
  
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
  
  created_at DATETIME,
  updated_at DATETIME,
  
  INDEX idx_customer_event (customer_id, event_type),
  INDEX idx_message_type (message_type),
  INDEX idx_created_at (created_at)
);
```

---

## API Usage

### Send Birthday Notification
```javascript
const birthdayNotificationService = require('./services/notifications/birthdayNotificationService');

// Send notification 7 days before
await birthdayNotificationService.sendBirthdayNotification(customer, 7);

// Send notification 3 days before
await birthdayNotificationService.sendBirthdayNotification(customer, 3);

// Send notification on birthday day
await birthdayNotificationService.sendBirthdayNotification(customer, 0);
```

### Send Custom Notification
```javascript
const notificationService = require('./services/notifications/notificationService');

await notificationService.sendNotification(
  customerId,
  'IN_STORE_PURCHASE',
  {
    email: {
      subject: 'Thank You for Your Purchase!',
      body: '<html>...</html>'
    },
    sms: 'Thanks for shopping! Your order #1234 is confirmed.'
  },
  {
    relatedEntityType: 'Sale',
    relatedEntityId: 1234,
    branchId: 1
  }
);
```

---

## Cron Schedule

### Birthday Notifications
```javascript
// Production: Daily at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  // Process 7-day reminders
  // Process 3-day reminders  
  // Process birthday-day messages
});

// Testing: Every minute
cron.schedule('* * * * *', async () => { ... });
```

---

## Testing Mode

### Enable Testing (No SMS Sent)
```javascript
// src/services/SMS/smsService.js
const TESTING_MODE = true; // Simulates SMS without calling Twilio
```

### Disable Testing (Send Real SMS)
```javascript
const TESTING_MODE = false; // Sends actual SMS via Twilio
```

---

## Monitoring & Logs

### Check Notification Status
```sql
SELECT 
  c.customer_name,
  nl.event_type,
  nl.message_type,
  nl.email_status,
  nl.sms_status,
  nl.created_at
FROM notification_logs nl
JOIN customers c ON nl.customer_id = c.id
WHERE nl.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY nl.created_at DESC;
```

### Failed Notifications
```sql
SELECT * FROM notification_logs
WHERE email_status = 'FAILED' OR sms_status = 'FAILED'
ORDER BY created_at DESC;
```

---

## Configuration Checklist

- [ ] Set `notificationChannel` in System Settings
- [ ] Configure Twilio credentials (for SMS)
- [ ] Configure Email credentials (Gmail SMTP)
- [ ] Enable cron job for birthday notifications
- [ ] Test with sample customer data
- [ ] Verify notification logs are being created
- [ ] Check SMS and Email delivery

---

## Support

For issues or questions:
1. Check `notification_logs` table for error messages
2. Verify system settings configuration
3. Ensure Twilio/Email credentials are correct
4. Check server logs for cron execution

---

**Last Updated**: December 31, 2025
