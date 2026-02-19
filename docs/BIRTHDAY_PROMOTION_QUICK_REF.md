# Birthday Promotion System - Quick Reference

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Add to .env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 2. Start Server
```bash
npm run dev
```

The cron job will automatically initialize and run daily at 6:00 AM.

## 📋 System Workflow

```
Day -7  →  Stage 1: Early Warning Email
           Create PromotionEmail (count=1)
           
Day -3  →  Stage 2: Reminder Email
           Update PromotionEmail (count=2)
           
Day 0   →  Stage 3: Birthday!
           • Create Promotion with unique coupon
           • Send Birthday Email with code
           • Update PromotionEmail (count=3)
```

## 🧪 Testing

```bash
# Create test customers
node test-birthday-promotion.js 1

# Test specific stage
node test-birthday-promotion.js 2  # Stage 1
node test-birthday-promotion.js 3  # Stage 2
node test-birthday-promotion.js 4  # Stage 3

# Test all stages
node test-birthday-promotion.js 5
```

## 📂 Key Files

| File | Purpose |
|------|---------|
| `src/models/promotion/promotionItems.js` | Product-promotion link table |
| `src/models/emails/promotionEmail.js` | Email tracking table |
| `src/utils/couponGenerator.js` | Generate unique coupon codes |
| `src/services/promotions/birthdayPromotionService.js` | Core business logic |
| `src/services/emails/birthdayPromotionEmailTemplates.js` | Email HTML templates |
| `src/controllers/promotion/birthdayPromotionCron.js` | Cron job scheduler |
| `test-birthday-promotion.js` | Manual testing script |

## 🔧 Configuration

### Change Discount Amount
```javascript
// In birthdayPromotionService.js:344
discountPercentage: 15.00,  // Change to desired %
```

### Change Validity Period
```javascript
// In birthdayPromotionService.js:351
endDate.setDate(endDate.getDate() + 7); // Change 7 to desired days
```

### Change Minimum Purchase
```javascript
// In birthdayPromotionService.js:348
minimumPurchaseAmount: 50.00,  // Change to desired amount
```

### Change Cron Schedule
```javascript
// In birthdayPromotionCron.js:109
const cronSchedule = '0 6 * * *';  // Daily at 6 AM
// For testing: '*/5 * * * *'       // Every 5 minutes
```

## 📊 Database Queries

### Check Stage Progress
```sql
SELECT 
  c.customer_name,
  c.email,
  pe.count AS stage,
  pe.promotion_id,
  p.coupon_code
FROM customers c
LEFT JOIN promotion_emails pe ON c.id = pe.customer_id
LEFT JOIN promotions p ON pe.promotion_id = p.id
WHERE MONTH(c.customer_birthday) = MONTH(CURDATE());
```

### Find Today's Birthdays
```sql
SELECT * FROM customers
WHERE MONTH(customer_birthday) = MONTH(CURDATE())
  AND DAY(customer_birthday) = DAY(CURDATE())
  AND is_active = 1;
```

### Check Generated Coupons
```sql
SELECT 
  coupon_code,
  discount_percentage,
  start_date,
  end_date,
  usage_count,
  is_active
FROM promotions
WHERE coupon_code LIKE 'BDAY-%'
ORDER BY created_at DESC;
```

## 🎯 Coupon Format

**Pattern:** `BDAY-[FIRSTNAME]-[RANDOM6]`

**Examples:**
- `BDAY-JOHN-A4B2C9`
- `BDAY-ALICE-X7Y2M5`
- `BDAY-MICHAEL-K9P3N1`

## ⚠️ Common Issues

### Emails Not Sending
```bash
# Check environment variables
echo $EMAIL_USER

# Verify Gmail App Password is set (not regular password)
```

### No Customers Found
```sql
-- Verify customer data has required fields
SELECT COUNT(*) FROM customers
WHERE customer_birthday IS NOT NULL
  AND email IS NOT NULL
  AND is_active = 1;
```

### Stage Skipped
```sql
-- Check previous stage completion
SELECT customer_id, count, promotion_type
FROM promotion_emails
WHERE customer_id = [ID];
```

## 📧 Email Stages

| Stage | Subject | Trigger | Action |
|-------|---------|---------|--------|
| 1 | "Something Special is Coming!" | 7 days before | Teaser email |
| 2 | "Your Birthday Surprise is Almost Ready!" | 3 days before | Reminder email |
| 3 | "Happy Birthday! Here's Your Exclusive Gift!" | Birthday | Coupon code email |

## 🔒 Security Checklist

- [x] Email credentials in `.env` (not hardcoded)
- [x] Using Sequelize ORM (SQL injection prevention)
- [x] Transaction safety for Stage 3
- [x] Unique coupon validation
- [x] Duplicate processing prevention (via count check)

## 📈 Monitoring

### Console Logs
```
🎂 BIRTHDAY PROMOTION CRON STARTED
⏰ Time: 2026-01-05 06:00:00
==================================================
✅ Found 3 customer(s)
👤 Processing: John Doe (CUS-0001)
   ✅ Success!
   🎟️  Coupon: BDAY-JOHN-A4B2C9
```

### Track Emails Sent
```sql
SELECT 
  DATE(created_at) AS date,
  count AS stage,
  COUNT(*) AS emails_sent
FROM promotion_emails
GROUP BY DATE(created_at), count
ORDER BY date DESC, stage;
```

## 🎨 Customize Email Templates

Edit `src/services/emails/birthdayPromotionEmailTemplates.js`:

```javascript
// Change colors
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

// Change text
<p>Your custom message here</p>

// Add logo
<img src="https://your-site.com/logo.png" alt="Logo">
```

## 📦 Dependencies

All already installed:
- `node-cron` - Scheduling
- `nodemailer` - Email sending
- `sequelize` - ORM
- `mysql2` - Database driver

## 🔄 Maintenance

```sql
-- Clean old promotion emails (yearly)
DELETE FROM promotion_emails 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Archive expired promotions
UPDATE promotions 
SET is_deleted = 1 
WHERE end_date < CURDATE() 
AND coupon_code LIKE 'BDAY-%';
```

## 📞 Support

1. Check [full documentation](./BIRTHDAY_PROMOTION_SYSTEM.md)
2. Review console logs
3. Verify database records
4. Test with `test-birthday-promotion.js`

---

**System Status:** ✅ Ready  
**Cron Schedule:** Daily at 6:00 AM  
**Auto-start:** ✅ Enabled in app.js
