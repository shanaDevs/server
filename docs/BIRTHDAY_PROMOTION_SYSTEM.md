# Birthday Promotion System Documentation

## Overview

An automated three-stage email notification system that creates personalized birthday promotions for customers. The system sends anticipatory emails leading up to a customer's birthday and automatically generates a unique coupon code on their special day.

## System Architecture

### Components

1. **Models**
   - `PromotionItem` - Product-specific promotion details
   - `PromotionEmail` - Tracks email stages for each customer
   - `Promotion` - Stores promotion details and coupon codes

2. **Services**
   - `birthdayPromotionService.js` - Core business logic for all three stages
   - `birthdayPromotionEmailTemplates.js` - Email HTML templates

3. **Utilities**
   - `couponGenerator.js` - Generates unique coupon codes

4. **Cron Job**
   - `birthdayPromotionCron.js` - Scheduled task running daily at 6:00 AM

## Three-Stage Workflow

### Stage 1: Early Warning (7 Days Before Birthday)

**Trigger:** 7 days before customer's birthday

**Actions:**
1. Check if customer already processed (no existing `PromotionEmail` record or `count < 1`)
2. Send "Something Special is Coming!" email
3. Create `PromotionEmail` record with `count = 1`

**Email Content:**
- Subject: "[Name], Something Special is Coming! 🎉"
- Message: Teaser about upcoming birthday surprise
- No promotion details yet

### Stage 2: Reminder (3 Days Before Birthday)

**Trigger:** 3 days before customer's birthday

**Prerequisites:** `PromotionEmail.count = 1` (Stage 1 completed)

**Actions:**
1. Verify Stage 1 was completed
2. Send "Your Birthday Surprise is Almost Ready!" email
3. Update `PromotionEmail` to `count = 2`

**Email Content:**
- Subject: "[Name], Your Birthday Surprise is Almost Ready! 🎊"
- Message: 3-day countdown, mentions exclusive promotion code coming
- Build anticipation

### Stage 3: Birthday Day (Promotion Creation)

**Trigger:** Customer's birthday (0 days)

**Prerequisites:** `PromotionEmail.count = 2` (Stage 2 completed)

**Actions (in transaction):**
1. Verify Stage 2 was completed
2. Generate unique coupon code (format: `BDAY-[NAME]-[RANDOM]`)
3. Create `Promotion` record with:
   - `promotionType`: BILL
   - `couponCode`: Generated unique code
   - `discountPercentage`: 15% (configurable)
   - `minimumPurchaseAmount`: $50 (configurable)
   - `maximumDiscountAmount`: $50 (configurable)
   - `startDate`: Today
   - `endDate`: Today + 7 days
   - `usageLimit`: 1 (one-time use)
   - `perCustomerLimit`: 1
4. Send birthday email with coupon code
5. Update `PromotionEmail` to `count = 3` and link `promotionId`

**Email Content:**
- Subject: "🎂 Happy Birthday [Name]! Here's Your Exclusive Gift!"
- Message: Happy birthday wishes with prominent coupon code display
- Details: Discount amount, validity period, terms

## Database Schema

### PromotionEmail Table
```sql
CREATE TABLE promotion_emails (
  id INT PRIMARY KEY AUTO_INCREMENT,
  promotionType ENUM('PRODUCT', 'BILL', 'BOGO', 'BUY_X_GET_Y') NOT NULL,
  count INT DEFAULT 0,
  promotionId INT NOT NULL,
  customerId INT NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (promotionId) REFERENCES promotions(id),
  FOREIGN KEY (customerId) REFERENCES customers(id),
  INDEX idx_promotionId (promotionId),
  INDEX idx_customerId (customerId),
  INDEX idx_promotion_customer (promotionId, customerId)
);
```

### PromotionItem Table
```sql
CREATE TABLE promotion_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  promotionId INT NOT NULL,
  productId INT NOT NULL,
  productCode VARCHAR(50),
  buyQty INT DEFAULT 1,
  getQty INT DEFAULT 0,
  discountPercentage DECIMAL(5,2) DEFAULT 0,
  discountAmount DECIMAL(10,2) DEFAULT 0,
  sellingPrice DECIMAL(10,2),
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (promotionId) REFERENCES promotions(id),
  FOREIGN KEY (productId) REFERENCES products(id),
  INDEX idx_promotionId (promotionId),
  INDEX idx_productId (productId),
  UNIQUE INDEX idx_promotion_product (promotionId, productId)
);
```

## Configuration

### Environment Variables

Required in `.env`:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
BASE_URL=http://localhost:5000
```

### Customizable Parameters

In `birthdayPromotionService.js`, Stage 3 method:

```javascript
const promotion = await Promotion.create({
  discountPercentage: 15.00,        // Change discount %
  minimumPurchaseAmount: 50.00,     // Change minimum purchase
  maximumDiscountAmount: 50.00,     // Change max discount
  usageLimit: 1,                    // Change usage limit
  // ... endDate calculation (7 days) can be modified
});
```

### Cron Schedule

In `birthdayPromotionCron.js`:

```javascript
// Production: Daily at 6:00 AM
const cronSchedule = '0 6 * * *';

// Testing: Every minute
const cronSchedule = '* * * * *';
```

## File Structure

```
server/
├── src/
│   ├── app.js (✅ Updated - initializes cron)
│   ├── models/
│   │   ├── index.js (✅ Updated - includes new models)
│   │   ├── promotion/
│   │   │   ├── promotion.js (existing)
│   │   │   └── promotionItems.js (✅ Created)
│   │   └── emails/
│   │       └── promotionEmail.js (✅ Created)
│   ├── services/
│   │   ├── promotions/
│   │   │   └── birthdayPromotionService.js (✅ Created)
│   │   └── emails/
│   │       └── birthdayPromotionEmailTemplates.js (✅ Created)
│   ├── controllers/
│   │   └── promotion/
│   │       └── birthdayPromotionCron.js (✅ Created)
│   └── utils/
│       └── couponGenerator.js (✅ Created)
└── test-birthday-promotion.js (✅ Created)
```

## Installation & Setup

### 1. Install Dependencies

Already installed (no new dependencies needed):
- `node-cron`
- `nodemailer`
- `sequelize`
- `mysql2`

### 2. Run Database Migrations

The models will auto-create tables on first run with Sequelize, or you can run:

```bash
npm run dev
```

Sequelize will sync the new tables automatically.

### 3. Configure Email

Update `.env` with your Gmail credentials:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

## Testing

### Manual Testing

```bash
# Create test data
node test-birthday-promotion.js 1

# Test Stage 1 only
node test-birthday-promotion.js 2

# Test Stage 2 only
node test-birthday-promotion.js 3

# Test Stage 3 only
node test-birthday-promotion.js 4

# Test all stages
node test-birthday-promotion.js 5
```

### Test Data Setup

Edit `test-birthday-promotion.js` and replace email addresses with your test email:

```javascript
const testCustomers = [
  {
    email: 'your-email@example.com', // ← Change this
    // ...
  }
];
```

### Testing Checklist

- [ ] Stage 1: Email sent 7 days before
- [ ] Stage 1: `PromotionEmail` created with `count = 1`
- [ ] Stage 2: Email sent 3 days before
- [ ] Stage 2: `PromotionEmail` updated to `count = 2`
- [ ] Stage 3: Promotion created with unique coupon
- [ ] Stage 3: Birthday email sent with coupon code
- [ ] Stage 3: `PromotionEmail` updated to `count = 3` with `promotionId`
- [ ] Coupon code is unique in database
- [ ] Transaction rollback works on email failure
- [ ] Duplicate processing prevented (idempotency)

## How It Works

### Daily Execution Flow

1. **6:00 AM Daily** - Cron job triggers
2. **Query Customers** - Find customers with birthdays:
   - 7 days from now
   - 3 days from now
   - Today
3. **Process Each Stage** - For each customer:
   - Check prerequisites (previous stage completion)
   - Send appropriate email
   - Update `PromotionEmail` tracking record
   - (Stage 3 only) Create `Promotion` in transaction

### Date Matching Logic

Uses MySQL date functions to compare only month/day:

```javascript
sequelize.where(
  sequelize.fn('MONTH', sequelize.col('customer_birthday')),
  targetMonth
),
sequelize.where(
  sequelize.fn('DAY', sequelize.col('customer_birthday')),
  targetDay
)
```

This ensures birthdays are matched regardless of year.

### Unique Coupon Generation

Algorithm:
1. Extract first name from customer name
2. Generate 6-character random alphanumeric string
3. Format: `BDAY-[FIRSTNAME]-[RANDOM6]`
4. Check database for uniqueness
5. Retry up to 10 times if collision
6. Fallback: Use timestamp if all retries fail

Example: `BDAY-JOHN-A4B2C9`

## Error Handling

### Email Failures

- Logs error to console
- Returns `{ success: false, reason: 'email_failed' }`
- Does NOT create/update database records if email fails

### Transaction Safety (Stage 3)

```javascript
const transaction = await sequelize.transaction();
try {
  // 1. Create Promotion
  // 2. Send Email
  // 3. Update PromotionEmail
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  // Promotion NOT created if email fails
}
```

### Duplicate Prevention

Each stage checks prerequisites:
- Stage 1: No record OR `count < 1`
- Stage 2: `count = 1` (exactly)
- Stage 3: `count = 2` (exactly)

This prevents duplicate emails and promotions.

## Monitoring & Logs

### Console Output

The cron job provides detailed logging:

```
🎂 BIRTHDAY PROMOTION CRON STARTED
⏰ Time: 2026-01-05 06:00:00
==================================================
🔍 Processing Stage 1: Early Warning (7 days before)
✅ Found 3 customer(s)
👤 Processing: John Doe (CUS-0001)
   📧 Email: john.doe@example.com
   ✅ Success!
   📤 Email sent successfully
```

### Database Tracking

Monitor `promotion_emails` table:
- `count = 1`: Stage 1 completed
- `count = 2`: Stage 2 completed
- `count = 3`: Stage 3 completed (promotion created)

Query to check status:
```sql
SELECT 
  c.customer_name,
  c.customer_birthday,
  pe.count,
  pe.promotion_id,
  p.coupon_code
FROM customers c
LEFT JOIN promotion_emails pe ON c.id = pe.customer_id
LEFT JOIN promotions p ON pe.promotion_id = p.id
WHERE c.is_active = 1
  AND MONTH(c.customer_birthday) = MONTH(CURDATE());
```

## Troubleshooting

### Emails Not Sending

1. Check environment variables:
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

2. Verify Gmail App Password (not regular password)

3. Check transporter initialization:
   ```javascript
   console.log('Transporter:', this.transporter);
   ```

### Cron Not Running

1. Verify cron is initialized in `app.js`:
   ```javascript
   require('./controllers/promotion/birthdayPromotionCron');
   ```

2. Check cron schedule syntax:
   ```javascript
   '0 6 * * *' // ✅ Valid
   '0 6 * *'   // ❌ Invalid (missing day of week)
   ```

### Duplicate Coupons

- Should never happen due to uniqueness check
- If it does, increase retry attempts in `couponGenerator.js`:
  ```javascript
  async function generateUniqueCoupon(name, check, maxRetries = 20) {
  ```

### No Customers Found

1. Verify customer data:
   ```sql
   SELECT * FROM customers 
   WHERE customer_birthday IS NOT NULL
   AND email IS NOT NULL
   AND is_active = 1;
   ```

2. Check date calculation:
   ```javascript
   const customers = await service.getCustomersWithBirthdaysIn(7);
   console.log('Found:', customers.length);
   ```

## Customization Examples

### Change Discount Amount

```javascript
// In birthdayPromotionService.js, processStage3()
discountPercentage: 20.00,  // 20% instead of 15%
```

### Add Product-Specific Promotions

```javascript
// After creating Promotion, create PromotionItem
await PromotionItem.create({
  promotionId: promotion.id,
  productId: specialProductId,
  buyQty: 1,
  getQty: 1,  // Buy 1 Get 1
  discountPercentage: 50.00
}, { transaction });
```

### Extend Validity Period

```javascript
// In birthdayPromotionService.js, processStage3()
const endDate = new Date(today);
endDate.setDate(endDate.getDate() + 14); // 14 days instead of 7
```

### Change Email Templates

Edit `birthdayPromotionEmailTemplates.js`:
- Modify HTML structure
- Change colors, fonts, layout
- Add company logo
- Customize messaging

## Security Considerations

1. **Email Credentials**: Store in `.env`, never commit to version control
2. **SQL Injection**: Using Sequelize ORM prevents SQL injection
3. **Coupon Uniqueness**: Validated before creation
4. **Transaction Safety**: Ensures data consistency
5. **Rate Limiting**: One email per stage per customer (via count check)

## Performance

### Optimization Tips

1. **Batch Processing**: Already implemented (processes all customers in one cron run)
2. **Indexed Queries**: Indexes on `customerId`, `promotionId` improve lookup speed
3. **Transaction Usage**: Only in Stage 3 where necessary
4. **Async Operations**: All I/O operations are async

### Expected Load

- Small (< 100 customers/day): No optimization needed
- Medium (100-1000 customers/day): Consider email queuing
- Large (> 1000 customers/day): Implement background job queue (Bull, Bee-Queue)

## Maintenance

### Regular Tasks

1. **Clean old PromotionEmail records**:
   ```sql
   DELETE FROM promotion_emails 
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
   ```

2. **Archive expired promotions**:
   ```sql
   UPDATE promotions 
   SET is_deleted = 1 
   WHERE end_date < CURDATE() 
   AND coupon_code LIKE 'BDAY-%';
   ```

3. **Monitor failed emails**: Check logs for email send failures

## Future Enhancements

- [ ] SMS notifications alongside emails
- [ ] Admin dashboard for monitoring
- [ ] A/B testing different discount amounts
- [ ] Personalized product recommendations
- [ ] Multi-language email templates
- [ ] Email queue for better reliability
- [ ] Analytics and reporting

## Support

For issues or questions:
1. Check logs in console output
2. Verify database records in `promotion_emails`
3. Test with `test-birthday-promotion.js`
4. Review error messages for specific issues

---

**Version:** 1.0.0  
**Last Updated:** January 5, 2026  
**Author:** Development Team
