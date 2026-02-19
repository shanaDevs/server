# Promotional Notification System

## Overview
Automatically sends beautiful promotional notifications with barcode support to all customers when a new promotion is created.

## Features

✨ **Key Features:**
- 🎨 Beautiful, responsive HTML email templates
- 📊 Barcode generation for coupon codes (Code128 format)
- 📧 Email notifications with gradient designs
- 📱 SMS notifications (optional)
- 🚀 Automatic sending when promotion is created
- 📝 Manual trigger option for existing promotions
- 📊 Comprehensive notification logging
- ⚙️ Configurable notification channels (EMAIL/SMS/BOTH)
- 🎯 Smart customer targeting (active customers only)

---

## How It Works

### Automatic Flow

When you create a new promotion via the API:

1. **Promotion Created** → Saved to database
2. **Notification Trigger** → Automatically sends to all active customers
3. **Channel Selection** → Based on system settings (EMAIL/SMS/BOTH)
4. **Barcode Generation** → If coupon code exists, generates Code128 barcode
5. **Email Delivery** → Beautiful HTML email with embedded barcode
6. **SMS Delivery** → (Optional) Text message with coupon code
7. **Logging** → All notifications logged in `NotificationLog` table

### Manual Flow

For existing promotions, you can manually trigger notifications:

```http
POST /api/promotions/{id}/send-notifications
Authorization: Bearer {token}
```

---

## Email Template Design

### Visual Elements

**🎨 Color Scheme:**
- Primary Gradient: `#FF6B6B` to `#FFE66D` (Coral to Yellow)
- Secondary Gradient: `#667eea` to `#764ba2` (Purple)
- Clean white content areas with subtle shadows

**📧 Email Structure:**
1. **Header Banner** - Eye-catching gradient with emoji and greeting
2. **Promotion Title** - Large, bold promotion name
3. **Discount Badge** - Highlighted discount value with gradient background
4. **Description Section** - Detailed promotion information
5. **Barcode Section** - Visual barcode with coupon code (if applicable)
6. **Terms & Conditions** - Clear list of requirements and validity
7. **Call-to-Action Button** - "Shop Now" button with gradient
8. **Urgency Message** - Countdown to promotion end date
9. **Footer** - Company information and contact details

### Barcode Display

When a coupon code exists:

```
┌─────────────────────────────────┐
│     SCAN THIS CODE AT CHECKOUT  │
│                                 │
│     [BARCODE IMAGE HERE]        │
│                                 │
│         SUMMER2024              │
│     Copy this code or scan      │
└─────────────────────────────────┘
```

---

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (Required for Email Notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# SMS Configuration (Optional - for SMS Notifications)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE=+1234567890

# Company Information (Optional - for email branding)
COMPANY_NAME=Your Store Name
COMPANY_EMAIL=info@yourstore.com
STORE_URL=https://yourstore.com

# Base URL (for links in email)
BASE_URL=http://localhost:5000
```

### 2. System Settings Configuration

Configure notification channels in your system settings:

```sql
-- Set notification channel preference
UPDATE system_settings 
SET notificationChannel = 'EMAIL_ONLY'  -- or 'SMS_ONLY' or 'EMAIL_AND_SMS'
WHERE id = 1;
```

**Channel Options:**
- `EMAIL_ONLY` - Send only emails (Default, safest option)
- `SMS_ONLY` - Send only SMS messages
- `EMAIL_AND_SMS` - Send both email and SMS

### 3. Customer Data Requirements

Ensure customers have valid contact information:

```sql
-- Customers need:
-- - email: Valid email address (for email notifications)
-- - phone: Valid phone number (for SMS notifications)
-- - isActive: true
-- - optOutNotifications: false

-- Example query to check customer data quality
SELECT 
    COUNT(*) as total_customers,
    SUM(CASE WHEN email IS NOT NULL AND email LIKE '%@%' THEN 1 ELSE 0 END) as with_email,
    SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as with_phone,
    SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active_customers
FROM customers;
```

---

## API Usage

### Create Promotion (Auto-sends notifications)

```http
POST /api/promotions
Authorization: Bearer {your-token}
Content-Type: application/json

{
  "promotionName": "Summer Sale 2024",
  "promotionDescription": "Get amazing discounts on all summer collection items!",
  "promotionType": "BILL",
  "discountType": "PERCENTAGE",
  "discountValue": 25,
  "couponCode": "SUMMER2024",
  "startDate": "2024-06-01",
  "endDate": "2024-08-31",
  "minPurchaseAmount": 5000,
  "maxDiscountAmount": 2000,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion created successfully. Notifications are being sent to all customers.",
  "data": {
    "id": 1,
    "promotionName": "Summer Sale 2024",
    "couponCode": "SUMMER2024",
    ...
  }
}
```

### Manual Send Notifications

For existing promotions:

```http
POST /api/promotions/1/send-notifications
Authorization: Bearer {your-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion notifications are being sent to all customers in the background.",
  "data": {
    "promotionId": 1,
    "promotionName": "Summer Sale 2024"
  }
}
```

---

## Notification Logging

All notifications are logged in the `NotificationLog` table:

```sql
SELECT 
    nl.id,
    nl.customerId,
    c.customerName,
    nl.channel,
    nl.status,
    nl.recipientEmail,
    nl.recipientPhone,
    nl.metadata,
    nl.createdAt
FROM notification_logs nl
JOIN customers c ON nl.customerId = c.id
WHERE nl.eventType = 'PROMOTION'
ORDER BY nl.createdAt DESC;
```

**Status Values:**
- `sent` - Successfully delivered
- `failed` - Delivery failed
- `pending` - Waiting to be sent

---

## Customization

### Email Template Customization

Edit [promotionEmailService.js](../src/services/emails/promotionEmailService.js):

```javascript
// Change colors
const primaryGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

// Modify sections
generatePromotionEmailHTML(promotion, customer, barcodeImage) {
    // Add your custom sections here
}
```

### Barcode Options

Customize barcode generation in [promotionEmailService.js](../src/services/emails/promotionEmailService.js):

```javascript
const barcodeImage = await barcodeGenerator.generateBarcode(
    promotion.couponCode,
    {
        bcid: 'code128',        // Barcode type: code128, qrcode, ean13, etc.
        scale: 4,               // Size scaling
        height: 15,             // Bar height in mm
        includetext: true,      // Show text below barcode
        textxalign: 'center'    // Text alignment
    }
);
```

**Supported Barcode Types:**
- `code128` - (Default) Alphanumeric, compact
- `qrcode` - 2D barcode for mobile scanning
- `ean13` - Product barcodes (13 digits)
- `code39` - Alphanumeric, widely supported
- `datamatrix` - 2D, high density

### SMS Message Customization

Edit [promotionNotificationService.js](../src/services/promotion/promotionNotificationService.js):

```javascript
// Customize SMS message format
let smsMessage = `🎉 ${promotion.promotionName}\n\n`;
// Add your custom message format
```

### Batch Processing Configuration

Control email sending rate:

```javascript
// In promotionNotificationService.js
await promotionEmailService.sendBulkPromotionEmails(
    promotion, 
    customers,
    {
        batchSize: 10,              // Emails per batch
        delayBetweenBatches: 2000   // Delay in milliseconds
    }
);
```

---

## Monitoring & Troubleshooting

### Console Logs

The system provides detailed console output:

```
🚀 Sending promotion notifications for: Summer Sale 2024
📧 Email notifications enabled
📧 Found 150 customers with valid email addresses
📧 Sending GRN email to: customer@example.com
📊 Progress: 10/150 emails processed
📊 Progress: 20/150 emails processed
...
✅ Bulk email send complete: 148 successful, 2 failed
✅ Promotion notifications sent: 148 customers reached
```

### Common Issues

**❌ "Email transporter not configured"**
- Solution: Set `EMAIL_USER` and `EMAIL_PASS` in `.env`

**❌ "SMS Gateway not configured"**
- Solution: Set Twilio credentials in `.env` or change channel to `EMAIL_ONLY`

**❌ "No customers with email found"**
- Solution: Update customer records to include valid email addresses

**❌ Emails go to spam**
- Solution: Use App-Specific Password for Gmail
- Solution: Configure SPF/DKIM records for your domain

### Gmail Setup (For EMAIL_USER)

1. Enable 2-Factor Authentication on your Google account
2. Generate App-Specific Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
   - Use this as `EMAIL_PASS` in `.env`

---

## Testing

### Test Email Sending

Create a test promotion:

```javascript
// Test with a small customer base first
const testCustomers = await Customer.findAll({
    where: { email: 'your-test-email@example.com' },
    limit: 1
});

await promotionEmailService.sendBulkPromotionEmails(
    testPromotion,
    testCustomers
);
```

### View Notification Logs

Check delivery status:

```sql
-- Recent notifications
SELECT * FROM notification_logs 
WHERE eventType = 'PROMOTION' 
ORDER BY createdAt DESC 
LIMIT 20;

-- Success rate
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM notification_logs
WHERE eventType = 'PROMOTION'
GROUP BY status;
```

---

## Performance Considerations

### Email Rate Limits

- **Gmail**: ~100-500 emails/day for free accounts
- **Gmail Workspace**: ~2,000 emails/day
- **Twilio SMS**: Based on your plan

**Recommendations:**
- Use batch processing (default: 10 emails per batch)
- Add delays between batches (default: 2 seconds)
- For large customer bases (>1000), consider:
  - Professional email service (SendGrid, AWS SES)
  - Queue system (Bull, RabbitMQ)

### Background Processing

Notifications are sent asynchronously using `setImmediate()`:
- API responds immediately
- Notifications sent in background
- Doesn't block promotion creation
- Errors logged but don't fail the operation

---

## Security & Privacy

### Customer Opt-Out

Respect customer preferences:

```sql
-- Customer opt-out flag
UPDATE customers 
SET optOutNotifications = true 
WHERE id = 123;
```

The system automatically excludes customers with `optOutNotifications = true`.

### Data Protection

- Email addresses are not exposed in logs
- Barcode images are generated on-the-fly, not stored
- Notification metadata is JSON-encoded for privacy
- All emails sent via secure SMTP

---

## Future Enhancements

Potential improvements:

- [ ] A/B testing for email templates
- [ ] Personalized discount codes per customer
- [ ] Click tracking and analytics
- [ ] Unsubscribe link in emails
- [ ] Preview promotion email before sending
- [ ] Schedule promotions for future sending
- [ ] Customer segmentation (VIP, loyalty tier, etc.)
- [ ] Multi-language support
- [ ] Rich push notifications
- [ ] WhatsApp integration

---

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review notification logs in database
- Verify email/SMS credentials
- Test with a single customer first

## Related Files

- **Email Service**: `src/services/emails/promotionEmailService.js`
- **Notification Service**: `src/services/promotion/promotionNotificationService.js`
- **Controller**: `src/controllers/promotion/promotionController.js`
- **Routes**: `src/routes/promotion/promotionRouter.js`
- **Barcode Generator**: `src/utils/barcodeGenerator.js`
