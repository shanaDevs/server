# Birthday Promotion System - Architecture Diagram

## System Flow Diagram

```
                    ┌─────────────────────────────────────┐
                    │   CRON JOB (Daily 6:00 AM)         │
                    │   birthdayPromotionCron.js          │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │  Birthday Promotion Service         │
                    │  birthdayPromotionService.js        │
                    └─────────────────┬───────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
        ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
        │   STAGE 1       │  │   STAGE 2      │  │   STAGE 3      │
        │  (7 days before)│  │  (3 days before)│  │  (Birthday)    │
        └────────┬────────┘  └───────┬────────┘  └───────┬────────┘
                 │                   │                    │
                 │                   │                    │
        ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
        │ Query Customers │  │ Query Customers│  │ Query Customers│
        │ MONTH/DAY = +7  │  │ MONTH/DAY = +3 │  │ MONTH/DAY = 0  │
        └────────┬────────┘  └───────┬────────┘  └───────┬────────┘
                 │                   │                    │
        ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
        │ Check:          │  │ Check:         │  │ Check:         │
        │ No record OR    │  │ count = 1      │  │ count = 2      │
        │ count < 1       │  │ (Stage 1 done) │  │ (Stage 2 done) │
        └────────┬────────┘  └───────┬────────┘  └───────┬────────┘
                 │                   │                    │
        ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
        │ Send Email:     │  │ Send Email:    │  │ Generate       │
        │ "Something      │  │ "Almost Ready" │  │ Unique Coupon  │
        │ Special Coming" │  │ Reminder       │  │ BDAY-XXX-123   │
        └────────┬────────┘  └───────┬────────┘  └───────┬────────┘
                 │                   │                    │
        ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
        │ Create/Update   │  │ Update         │  │ CREATE         │
        │ PromotionEmail  │  │ PromotionEmail │  │ Promotion      │
        │ count = 1       │  │ count = 2      │  │ (Transaction)  │
        └─────────────────┘  └────────────────┘  └───────┬────────┘
                                                          │
                                                  ┌───────▼────────┐
                                                  │ Send Birthday  │
                                                  │ Email w/Coupon │
                                                  └───────┬────────┘
                                                          │
                                                  ┌───────▼────────┐
                                                  │ Update         │
                                                  │ PromotionEmail │
                                                  │ count = 3      │
                                                  │ promotionId=X  │
                                                  └────────────────┘
```

## Database Schema Relationships

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Customer    │         │ PromotionEmail   │         │  Promotion   │
├──────────────┤         ├──────────────────┤         ├──────────────┤
│ id (PK)      │◄────────│ customerId (FK)  │────────►│ id (PK)      │
│ name         │         │ promotionId (FK) │         │ couponCode   │
│ email        │         │ promotionType    │         │ discountPct  │
│ birthday     │         │ count            │         │ startDate    │
│ ...          │         │ (1, 2, or 3)     │         │ endDate      │
└──────────────┘         └──────────────────┘         └──────┬───────┘
                                                              │
                                                              │
                                                      ┌───────▼───────┐
                                                      │ PromotionItem │
                                                      ├───────────────┤
                                                      │ id (PK)       │
                                                      │ promotionId   │
                                                      │ productId     │
                                                      │ discountAmt   │
                                                      └───────────────┘
```

## Stage Progression

```
Customer Record Created
         │
         │ customer_birthday = 2026-01-15
         │ email = john@example.com
         │
         ▼
    ┌─────────┐
    │ Day -7  │  January 8, 2026
    └────┬────┘
         │
         ├──► Check: No PromotionEmail OR count < 1 ✓
         ├──► Send: Early Warning Email
         ├──► Action: INSERT PromotionEmail (count=1, promotionId=0)
         │
         ▼
    ┌─────────┐
    │ Day -3  │  January 12, 2026
    └────┬────┘
         │
         ├──► Check: PromotionEmail.count = 1 ✓
         ├──► Send: Reminder Email
         ├──► Action: UPDATE PromotionEmail SET count=2
         │
         ▼
    ┌─────────┐
    │ Day 0   │  January 15, 2026 (Birthday!)
    └────┬────┘
         │
         ├──► Check: PromotionEmail.count = 2 ✓
         ├──► Generate: BDAY-JOHN-A4B2C9
         ├──► Action: BEGIN TRANSACTION
         │    ├─► INSERT Promotion (coupon, 15% off, 7-day validity)
         │    ├─► Send: Birthday Email with Coupon
         │    └─► UPDATE PromotionEmail SET count=3, promotionId=X
         ├──► Action: COMMIT TRANSACTION
         │
         ▼
    ┌─────────┐
    │Complete │  Stage 3 done, customer can use coupon
    └─────────┘
```

## Email Template Flow

```
┌─────────────────────────────────────────────────────────┐
│  birthdayPromotionEmailTemplates.js                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ getEarlyWarningEmail(customer)             │        │
│  │   Returns: { subject, html }               │        │
│  │   Design: Purple gradient, teaser message  │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ getReminderEmail(customer)                 │        │
│  │   Returns: { subject, html }               │        │
│  │   Design: Pink gradient, countdown         │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ getBirthdayEmail(customer, promotion)      │        │
│  │   Returns: { subject, html }               │        │
│  │   Design: Gold gradient, coupon box        │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Coupon Generation Process

```
Customer Name: "John Michael Doe"
         │
         ▼
Extract First Name: "John"
         │
         ▼
Uppercase & Clean: "JOHN"
         │
         ▼
Generate Random: "A4B2C9" (6 chars)
         │
         ▼
Combine: "BDAY-JOHN-A4B2C9"
         │
         ▼
Check Database: EXISTS?
         │
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ▼         ▼
  Retry   Return Code
  (10x)   ✓ Success
    │
    ▼
 Fallback:
 "BDAY-XXXX-[Timestamp]"
```

## Transaction Safety (Stage 3)

```
BEGIN TRANSACTION
    │
    ├─► Step 1: Generate unique coupon code
    │   └─► Check database for uniqueness (10 retries)
    │
    ├─► Step 2: Create Promotion record
    │   └─► INSERT INTO promotions (couponCode, discount, dates...)
    │
    ├─► Step 3: Send birthday email
    │   └─► nodemailer.sendMail(to, subject, html)
    │   └─► IF FAILS → ROLLBACK ❌
    │
    ├─► Step 4: Update PromotionEmail
    │   └─► UPDATE promotion_emails SET count=3, promotionId=X
    │
    └─► COMMIT TRANSACTION ✓
```

## Error Handling Flow

```
                    Process Stage
                         │
                         ▼
                    Find Customers
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Found = 0        Found > 0         Error
        │                │                │
        ▼                ▼                ▼
   Return: 0        For Each       Log Error
   processed        Customer       Return: failed
                         │
                         ▼
                    Check Prerequisites
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Not Met           Met            Error
        │                │                │
        ▼                ▼                ▼
   Skip: reason     Send Email      Log Error
   (already_done)        │           Continue
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Failed            Success          Error
        │                │                │
        ▼                ▼                ▼
   Return:          Update DB      Log Error
   email_failed     Return:        Return:
                    success        failed
```

## Monitoring Dashboard (SQL Queries)

```
┌─────────────────────────────────────────────────────────┐
│  MONITORING QUERIES                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Today's Birthdays:                                  │
│     SELECT * FROM customers                             │
│     WHERE MONTH/DAY = TODAY AND is_active = 1           │
│                                                          │
│  2. Stage Progress:                                     │
│     SELECT customer_name, count AS stage                │
│     FROM customers JOIN promotion_emails                │
│                                                          │
│  3. Generated Coupons Today:                            │
│     SELECT coupon_code, discount_percentage             │
│     FROM promotions                                      │
│     WHERE DATE(created_at) = CURDATE()                  │
│                                                          │
│  4. Email Success Rate:                                 │
│     SELECT count, COUNT(*) AS total                     │
│     FROM promotion_emails GROUP BY count                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## System Components Map

```
project-root/
│
├── src/
│   ├── app.js ─────────────────────► Initialize cron
│   │
│   ├── models/
│   │   ├── index.js ───────────────► Export all models
│   │   ├── promotion/
│   │   │   ├── promotion.js
│   │   │   └── promotionItems.js ──► NEW TABLE
│   │   └── emails/
│   │       └── promotionEmail.js ──► NEW TABLE
│   │
│   ├── services/
│   │   ├── promotions/
│   │   │   └── birthdayPromotionService.js ► Business Logic
│   │   └── emails/
│   │       └── birthdayPromotionEmailTemplates.js ► HTML
│   │
│   ├── controllers/
│   │   └── promotion/
│   │       └── birthdayPromotionCron.js ► Scheduler
│   │
│   └── utils/
│       └── couponGenerator.js ─────► Unique Codes
│
├── test-birthday-promotion.js ─────► Manual Testing
│
└── docs/
    ├── BIRTHDAY_PROMOTION_SYSTEM.md ► Full Docs
    └── BIRTHDAY_PROMOTION_QUICK_REF.md ► Quick Ref
```

---

**Legend:**
- `►` = Executes/Calls
- `◄` = Foreign Key Reference
- `✓` = Success Path
- `❌` = Failure Path
- `(PK)` = Primary Key
- `(FK)` = Foreign Key
