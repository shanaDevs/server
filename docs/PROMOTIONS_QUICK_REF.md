# Promotions Module - Quick Reference

## 🚀 Quick Start

### Create a Promotion
```bash
POST /api/promotions
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "productId": 1,
  "title": "Flash Sale",
  "discountPercentage": 25,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "isActive": true
}
```

### Get All Promotions
```bash
GET /api/promotions?page=1&limit=10&isActive=true
```

### Calculate Discount
```bash
GET /api/promotions/product/123/calculate?originalPrice=100
```

### Validate Promo Code
```bash
GET /api/promotions/validate/SUMMER20?productId=123
```

## 📋 Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| productId | Integer | ✅ Yes | Product to apply promotion |
| title | String(100) | ❌ No | Promotion title |
| description | Text | ❌ No | Promotion description |
| discountPercentage | Decimal(5,2) | ⚠️ One required | 0-100% discount |
| discountValue | Decimal(10,2) | ⚠️ One required | Fixed amount discount |
| promoCode | String(50) | ❌ No | Promotional code |
| startDate | DateTime | ✅ Yes | When promotion starts |
| endDate | DateTime | ✅ Yes | When promotion ends |
| isActive | Boolean | ❌ No | Default: true |

## 🔒 Required Permissions

- `promotion:read` - View promotions
- `promotion:create` - Create promotions
- `promotion:update` - Update promotions
- `promotion:delete` - Delete promotions

## ⚠️ Important Rules

1. **Either** `discountPercentage` **OR** `discountValue` must be provided
2. `endDate` must be **after** `startDate`
3. **No overlapping** active promotions for the same product
4. `discountPercentage` must be between **0-100**
5. Deletes are **soft** (data preserved)

## 📝 Common Examples

### Percentage Discount
```json
{
  "productId": 1,
  "title": "20% Off",
  "discountPercentage": 20,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

### Fixed Value Discount
```json
{
  "productId": 1,
  "title": "$50 Off",
  "discountValue": 50,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

### With Promo Code
```json
{
  "productId": 1,
  "title": "New Year Sale",
  "discountPercentage": 15,
  "promoCode": "NEWYEAR15",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-15T23:59:59Z"
}
```

## 🔍 Filtering Options

```bash
# Active promotions only
GET /api/promotions?isActive=true

# By product
GET /api/promotions?productId=123

# By date range
GET /api/promotions?startDate=2025-01-01&endDate=2025-12-31

# Pagination
GET /api/promotions?page=2&limit=20

# Combined
GET /api/promotions?isActive=true&productId=123&page=1&limit=10
```

## 🧮 Service Methods (for Integration)

```javascript
// Get active promotions for product
const promotions = await promotionService.getActivePromotionsForProduct(productId);

// Calculate discounted price
const result = await promotionService.calculateDiscountedPrice(productId, originalPrice);
// Returns: { originalPrice, discountedPrice, discount, promotion }

// Validate promo code
const validation = await promotionService.validatePromoCode('SUMMER20', productId);
// Returns: { valid: true/false, promotion/message }
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/promotions` | List all promotions |
| GET | `/api/promotions/:id` | Get promotion by ID |
| POST | `/api/promotions` | Create promotion |
| PUT | `/api/promotions/:id` | Update promotion |
| DELETE | `/api/promotions/:id` | Delete promotion |
| GET | `/api/promotions/product/:productId/active` | Active promotions for product |
| GET | `/api/promotions/product/:productId/calculate` | Calculate discounted price |
| GET | `/api/promotions/validate/:promoCode` | Validate promo code |

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Error
```json
{
  "success": false,
  "errors": [
    {
      "field": "discountPercentage",
      "message": "Discount percentage must be between 0 and 100"
    }
  ]
}
```

## 🎯 Integration Example (POS)

```javascript
// In your sales/POS controller:

async function processSale(req, res) {
  const { productId, quantity } = req.body;
  
  // Get product
  const product = await Product.findByPk(productId);
  
  // Calculate with promotion
  const priceResult = await promotionService.calculateDiscountedPrice(
    productId,
    product.sellingPrice
  );
  
  // Use discounted price
  const totalPrice = priceResult.discountedPrice * quantity;
  
  // Create sale with promotion info
  const sale = await Sale.create({
    productId,
    quantity,
    unitPrice: priceResult.discountedPrice,
    originalPrice: priceResult.originalPrice,
    discount: priceResult.discount,
    promotionId: priceResult.promotion?.id,
    total: totalPrice
  });
  
  res.json({ success: true, data: sale });
}
```

## 🐛 Troubleshooting

### "An active promotion already exists"
- Check for overlapping date ranges
- Deactivate or update existing promotion first

### "Product not found"
- Verify productId exists in database
- Check if product is active

### "End date must be after start date"
- Ensure endDate > startDate
- Use ISO 8601 format: `2025-12-31T23:59:59Z`

### "Either discount percentage or discount value is required"
- Provide at least one discount type
- Don't leave both empty

## 📖 More Documentation

See [PROMOTIONS_MODULE.md](./PROMOTIONS_MODULE.md) for complete documentation.

---

**Quick Access:** `http://localhost:3000/api-docs` → Promotions section
