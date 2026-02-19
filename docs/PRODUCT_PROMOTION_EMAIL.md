# Product Promotion Email System

## Overview
A comprehensive system for sending promotional emails with product details to selected customers.

## Features
- ✅ Beautiful HTML email templates with product cards
- ✅ Product images, descriptions, and pricing
- ✅ Discount calculations (percentage or fixed amount)
- ✅ "Shop Now" button for each product and main CTA
- ✅ Coupon code support
- ✅ Customer selection by IDs, emails, or filters
- ✅ Batch processing to avoid overwhelming email servers
- ✅ Email preview functionality
- ✅ Notification logging

## API Endpoints

### 1. Send Product Promotion Email
**Endpoint:** `POST /api/promotions/send-product-promotion-email`

**Authentication:** Required (Bearer Token)

**Permission:** `promotions.update`

**Request Body:**
```json
{
  "promotionId": 1,
  "promotion": {
    "title": "Summer Sale 2026",
    "description": "Get amazing discounts on selected products!",
    "discountPercentage": 20,
    "discountValue": 0,
    "couponCode": "SUMMER20",
    "startDate": "2026-01-05",
    "endDate": "2026-01-31"
  },
  "productIds": [1, 2, 3],
  "productCodes": ["P001", "P002"],
  "customerIds": [1, 2, 3],
  "customerEmails": ["customer@example.com"],
  "customerFilter": {
    "customerType": "vip",
    "minTotalPurchases": 1000,
    "minLoyaltyPoints": 100
  },
  "batchSize": 10,
  "delayBetweenBatches": 2000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email campaign completed: 50 sent, 2 failed",
  "data": {
    "promotion": {
      "id": 1,
      "title": "Summer Sale 2026"
    },
    "products": [
      {
        "id": 1,
        "name": "Product Name",
        "productCode": "P001"
      }
    ],
    "total": 52,
    "successful": 50,
    "failed": 2,
    "details": [...]
  }
}
```

### 2. Preview Product Promotion Email
**Endpoint:** `POST /api/promotions/preview-product-promotion-email`

**Authentication:** Required (Bearer Token)

**Permission:** `promotions.read`

**Request Body:**
```json
{
  "promotionId": 1,
  "promotion": {
    "title": "Summer Sale 2026",
    "description": "Get amazing discounts on selected products!",
    "discountPercentage": 20,
    "couponCode": "SUMMER20",
    "startDate": "2026-01-05",
    "endDate": "2026-01-31"
  },
  "productIds": [1, 2, 3],
  "customerId": 1
}
```

**Response:**
Returns HTML content for preview

### 3. Get Customers for Promotion
**Endpoint:** `POST /api/promotions/get-customers-for-promotion`

**Authentication:** Required (Bearer Token)

**Permission:** `promotions.read`

**Request Body:**
```json
{
  "customerIds": [1, 2, 3],
  "customerEmails": ["customer@example.com"],
  "customerFilter": {
    "customerType": "vip",
    "minTotalPurchases": 1000,
    "minLoyaltyPoints": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customerCode": "C001",
      "customerName": "John Doe",
      "email": "john@example.com",
      "phone": "0771234567",
      "customerType": "vip",
      "totalPurchases": 5000.00,
      "loyaltyPoints": 250
    }
  ],
  "count": 1
}
```

## Email Template Features

### Product Cards Include:
- Product image (or placeholder icon)
- Product name and description
- Product code
- Original price
- Discounted price (if applicable)
- Savings amount highlight
- Individual "Shop Now" button

### Email Structure:
1. **Header Banner** - Eye-catching gradient with promotion title
2. **Promotion Description** - Highlighted message box
3. **Product Cards** - Beautiful cards for each product
4. **Coupon Code Section** - Large, easy-to-copy coupon code
5. **Validity Period** - Clear date range warning
6. **Main CTA Button** - Large "Shop Now" button
7. **Footer** - Company information and links

## Usage Examples

### Example 1: Send to Specific Customers with Existing Promotion
```bash
curl -X POST http://localhost:3000/api/promotions/send-product-promotion-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "promotionId": 1,
    "productIds": [1, 2, 3],
    "customerIds": [1, 2, 3]
  }'
```

### Example 2: Create Inline Promotion and Send to VIP Customers
```bash
curl -X POST http://localhost:3000/api/promotions/send-product-promotion-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "promotion": {
      "title": "VIP Exclusive Sale",
      "description": "As our valued VIP customer, enjoy exclusive discounts!",
      "discountPercentage": 25,
      "couponCode": "VIP25",
      "startDate": "2026-01-05",
      "endDate": "2026-01-20"
    },
    "productCodes": ["P001", "P002", "P003"],
    "customerFilter": {
      "customerType": "vip"
    }
  }'
```

### Example 3: Preview Email Before Sending
```bash
curl -X POST http://localhost:3000/api/promotions/preview-product-promotion-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "promotionId": 1,
    "productIds": [1, 2],
    "customerId": 1
  }' > preview.html
```

## Environment Variables Required

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Company Information
COMPANY_NAME=Your Store Name
COMPANY_EMAIL=info@yourstore.com
STORE_URL=https://yourstore.com
```

## Customer Selection Options

### 1. By Customer IDs
```json
{
  "customerIds": [1, 2, 3, 4, 5]
}
```

### 2. By Email Addresses
```json
{
  "customerEmails": [
    "customer1@example.com",
    "customer2@example.com"
  ]
}
```

### 3. By Filter Criteria
```json
{
  "customerFilter": {
    "customerType": "vip",
    "minTotalPurchases": 1000,
    "minLoyaltyPoints": 100
  }
}
```

**Available Customer Types:**
- `retail`
- `wholesale`
- `distributor`
- `vip`

## Product Selection Options

### 1. By Product IDs
```json
{
  "productIds": [1, 2, 3, 4, 5]
}
```

### 2. By Product Codes
```json
{
  "productCodes": ["P001", "P002", "P003"]
}
```

## Email Batching

To prevent overwhelming email servers and avoid being flagged as spam:

- **batchSize**: Number of emails to send in each batch (default: 10)
- **delayBetweenBatches**: Delay in milliseconds between batches (default: 2000ms)

```json
{
  "batchSize": 20,
  "delayBetweenBatches": 3000
}
```

## Notification Logging

All email sends are automatically logged in the `notification_logs` table with:
- Customer information
- Promotion details
- Send status (sent/failed)
- Error messages (if failed)
- Message metadata

## Testing

### Test with Postman:
1. Import the provided Postman collection
2. Set your authentication token
3. Update the request body with your test data
4. Send the request

### Test Preview:
1. Use the preview endpoint
2. Save the HTML response to a file
3. Open in a browser to see the email design

## Error Handling

The system handles various error scenarios:
- Invalid or missing email addresses
- Products not found
- Customers not found
- Email server issues
- Database logging failures

All errors are logged and returned in the response.

## Files Created

1. **Service:** `src/services/emails/productPromotionEmailService.js`
   - Email template generation
   - Email sending logic
   - Batch processing

2. **Controller:** `src/controllers/promotion/productPromotionEmailController.js`
   - Request validation
   - Customer/product fetching
   - Response handling

3. **Routes:** Added to `src/routes/promotion/promotionRouter.js`
   - `/send-product-promotion-email`
   - `/preview-product-promotion-email`
   - `/get-customers-for-promotion`

## Support

For issues or questions, please check:
- Email credentials in `.env` file
- Database connections
- Customer email addresses are valid
- Products exist and are active
