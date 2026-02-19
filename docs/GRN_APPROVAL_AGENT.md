# GRN Approval Intelligent Agent

## Overview

This agent automatically handles the complete GRN (Goods Receipt Note) approval workflow, including:
- ✅ GRN validation and approval
- 📄 PDF generation with payment details
- 💾 PDF file storage to server
- 📧 Email notification to suppliers
- 🔗 Public PDF download links

---

## Features

### 1. **GRN Validation**
- Validates all GRN items have valid pricing (unitCost, sellingPrice, MRP)
- Ensures sellingPrice ≤ MRP
- Requires payment method and amount

### 2. **Payment Processing**
The agent automatically calculates payment type based on amounts:

| Scenario | Payment Type | Display |
|----------|-------------|---------|
| Paid = Total | `full` | ✓ FULLY PAID (Green) |
| Paid < Total | `credit` | ⚠ BALANCE DUE (Red) |
| Paid > Total | `debit` | ⟲ OVERPAID (Orange) |

### 3. **PDF Generation**
Generates professional PDF with:
- Company header with logo
- Supplier details
- GRN number and date
- Items table with: Product, Payment Type, Quantity, Unit Cost, Total
- **Payment Summary Section**:
  - Payment Type (color-coded)
  - Payment Method (CASH, CARD, QR, etc.)
  - Paid Amount
  - Balance/Refund amount
  - Status badge
- Inspection notes
- Signatures section

### 4. **PDF Storage**
- Saves PDF to: `public/pdfs/GRN-<grnNumber>.pdf`
- Accessible via: `http://your-server.com/pdfs/GRN-<grnNumber>.pdf`
- Directory auto-creates if missing

### 5. **Email Notification**
Sends HTML email to supplier with:
- Approval confirmation
- GRN details (number, amount, status)
- Download button for PDF
- PDF attached to email
- Fallback text link

---

## API Usage

### Approve GRN

**Endpoint:** `PUT /api/grns/:id/status`

**Request Body:**
```json
{
  "status": "approved",
  "paymentMethod": "CASH",
  "paymentAmount": 4500000
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "GRN approved successfully",
  "data": {
    "id": 1,
    "grnNumber": "GRN20250001",
    "status": "approved",
    "totalAmount": 4000000
  },
  "pdf": "base64-encoded-pdf-data...",
  "pdfFileName": "GRN-GRN20250001.pdf",
  "pdfLink": "http://localhost:3000/pdfs/GRN-GRN20250001.pdf",
  "emailSent": true,
  "emailRecipient": "supplier@example.com"
}
```

---

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Server Base URL (for PDF links)
BASE_URL=http://localhost:3000

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Gmail Setup (for EMAIL_PASS)

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
   - Use this as `EMAIL_PASS`

---

## How It Works

### Approval Flow

```
1. API Request: PUT /api/grns/:id/status
   ↓
2. Validate GRN items & prices
   ↓
3. Calculate payment type (full/credit/debit)
   ↓
4. Update GRN status to "approved"
   ↓
5. Create Payment record
   ↓
6. Update inventory ledger
   ↓
7. Generate PDF with payment details
   ↓
8. Save PDF to public/pdfs/
   ↓
9. Send email to supplier (if email exists)
   ↓
10. Return API response with PDF link
```

### Payment Type Logic

```javascript
if (paidAmount > totalAmount) {
  paymentType = 'debit';      // Overpayment → Refund
  balanceAmount = paidAmount - totalAmount;
} else if (paidAmount < totalAmount) {
  paymentType = 'credit';     // Underpayment → Balance Due
  balanceAmount = totalAmount - paidAmount;
} else {
  paymentType = 'full';       // Exact payment → Fully Paid
  balanceAmount = 0;
}
```

---

## Email Template

The supplier receives an email like this:

```
┌────────────────────────────────────┐
│        ✓ GRN Approved              │
└────────────────────────────────────┘

Dear Supplier Name,

Your Goods Receipt Note GRN20250001 has been approved.

┌────────────────────────────────────┐
│ GRN Number: GRN20250001            │
│ Total Amount: Rs. 4000000.00       │
│ Status: Approved                   │
└────────────────────────────────────┘

You can download the GRN PDF by clicking the button below:

    [ 📄 Download GRN PDF ]

Or copy this link: http://localhost:3000/pdfs/GRN-GRN20250001.pdf

Thank you for your business.
```

---

## File Structure

```
server/
├── public/
│   └── pdfs/                    # Generated PDFs saved here
│       └── GRN-GRN20250001.pdf
├── src/
│   ├── controllers/
│   │   └── grns/
│   │       └── grnController.js # GRN approval logic
│   ├── services/
│   │   ├── grns/
│   │   │   └── grnService.js    # Business logic
│   │   └── emails/
│   │       └── emailService.js  # Email sending
│   ├── utils/
│   │   └── pdfGenerator.js      # PDF generation
│   └── models/
│       └── payment/
│           └── payment.js       # Payment model
```

---

## Error Handling

### No Email Address
If supplier has no email:
- PDF is still generated and saved
- Email is skipped
- Response includes: `"emailSent": false`

### Email Credentials Missing
If `EMAIL_USER` or `EMAIL_PASS` not configured:
- PDF is still generated
- Email is skipped
- Warning logged to console

### PDF Generation Fails
If PDF generation throws error:
- GRN approval still completes
- Response includes error message
- Inventory is still updated

---

## Testing

### Test with curl

```bash
# Approve GRN with full payment
curl -X PUT http://localhost:3000/api/grns/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "paymentMethod": "CASH",
    "paymentAmount": 4000000
  }'

# Approve GRN with credit (underpayment)
curl -X PUT http://localhost:3000/api/grns/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "paymentMethod": "CARD",
    "paymentAmount": 3500000
  }'

# Approve GRN with debit (overpayment)
curl -X PUT http://localhost:3000/api/grns/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "paymentMethod": "BANK",
    "paymentAmount": 4500000
  }'
```

### Access PDF

After approval, access the PDF at:
```
http://localhost:3000/pdfs/GRN-GRN20250001.pdf
```

---

## Database Changes

### Payment Model
Added `paymentType` field:
```javascript
{
  paymentType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'full, credit, debit'
  }
}
```

### Email Log
Records all emails sent:
```javascript
{
  emailType: 'grn_approved',
  recipientEmail: 'supplier@example.com',
  status: 'sent',
  relatedEntityType: 'GRN',
  relatedEntityId: 1,
  gmailMessageId: '<message-id>'
}
```

---

## Troubleshooting

### PDF not accessible
1. Check `public/pdfs/` directory exists
2. Verify static file middleware in `app.js`
3. Check file permissions

### Email not sending
1. Verify `EMAIL_USER` and `EMAIL_PASS` in `.env`
2. Check Gmail App Password is correct
3. Look for error logs in console
4. Check EmailLog table for failure reason

### Payment type incorrect
1. Verify `paidAmount` and `totalAmount` values
2. Check payment calculation logic
3. Ensure `paymentType` field exists in Payment model

---

## Support

For issues or questions, check:
- Server logs for detailed errors
- EmailLog table for email status
- Generated PDF in `public/pdfs/` directory
- Network tab for API response

---

## Future Enhancements

- [ ] Support multiple PDF templates
- [ ] Batch GRN approvals
- [ ] SMS notifications
- [ ] WhatsApp integration
- [ ] Digital signatures
- [ ] PDF watermarks
- [ ] Email retry mechanism
- [ ] PDF compression

---

**Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Status:** ✅ Production Ready
