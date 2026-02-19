# Promotions Module - Complete Documentation

## Overview
The Promotions module provides a comprehensive system for managing product promotions, discounts, and special offers. It supports percentage-based and fixed-value discounts with date-based activation and promotional code validation.

## Features
- ✅ Create and manage product promotions
- ✅ Percentage-based and fixed-value discounts
- ✅ Date-based promotion activation
- ✅ Promotional code system
- ✅ Automatic overlap detection
- ✅ Active promotion filtering
- ✅ Price calculation with discounts
- ✅ Soft delete functionality
- ✅ Full Swagger API documentation

## Database Schema

### Promotion Model
```javascript
{
  id: INTEGER (Primary Key, Auto-increment)
  productId: INTEGER (Required, Foreign Key to Product)
  title: STRING(100)
  description: TEXT
  discountPercentage: DECIMAL(5,2) - Value between 0-100
  discountValue: DECIMAL(10,2) - Fixed discount amount
  promoCode: STRING(50)
  startDate: DATE (Required)
  endDate: DATE (Required)
  isActive: BOOLEAN (Default: true)
  isDeleted: BOOLEAN (Default: false)
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

## API Endpoints

### 1. Get All Promotions
**GET** `/api/promotions`

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10) - Items per page
- `isActive` (boolean) - Filter by active status
- `productId` (integer) - Filter by product
- `startDate` (date) - Filter by start date
- `endDate` (date) - Filter by end date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "productId": 5,
      "title": "Summer Sale",
      "description": "Get 20% off on this product",
      "discountPercentage": 20,
      "discountValue": null,
      "promoCode": "SUMMER20",
      "startDate": "2025-06-01T00:00:00Z",
      "endDate": "2025-08-31T23:59:59Z",
      "isActive": true,
      "product": {
        "id": 5,
        "name": "Product Name",
        "productCode": "PROD-001",
        "sellingPrice": 100,
        "costPrice": 70
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 2. Get Promotion by ID
**GET** `/api/promotions/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "productId": 5,
    "title": "Summer Sale",
    "discountPercentage": 20,
    "product": { ... }
  }
}
```

### 3. Create Promotion
**POST** `/api/promotions`

**Request Body:**
```json
{
  "productId": 5,
  "title": "Summer Sale",
  "description": "Get 20% off on this product",
  "discountPercentage": 20,
  "promoCode": "SUMMER20",
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-08-31T23:59:59Z",
  "isActive": true
}
```

**Validation Rules:**
- `productId` is required and must exist
- Either `discountPercentage` OR `discountValue` is required
- `discountPercentage` must be between 0-100
- `discountValue` must be positive
- `startDate` is required
- `endDate` is required and must be after `startDate`
- No overlapping promotions for the same product

**Response:**
```json
{
  "success": true,
  "message": "Promotion created successfully",
  "data": { ... }
}
```

### 4. Update Promotion
**PUT** `/api/promotions/:id`

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Summer Sale",
  "discountPercentage": 25,
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Promotion updated successfully",
  "data": { ... }
}
```

### 5. Delete Promotion
**DELETE** `/api/promotions/:id`

**Response:**
```json
{
  "success": true,
  "message": "Promotion deleted successfully"
}
```

### 6. Get Active Promotions for Product
**GET** `/api/promotions/product/:productId/active`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Summer Sale",
      "discountPercentage": 20,
      ...
    }
  ]
}
```

### 7. Calculate Discounted Price
**GET** `/api/promotions/product/:productId/calculate?originalPrice=100`

**Query Parameters:**
- `originalPrice` (required) - Original product price

**Response:**
```json
{
  "success": true,
  "data": {
    "originalPrice": 100,
    "discountedPrice": 80,
    "discount": 20,
    "promotion": {
      "id": 1,
      "title": "Summer Sale",
      "promoCode": "SUMMER20"
    }
  }
}
```

### 8. Validate Promo Code
**GET** `/api/promotions/validate/:promoCode?productId=5`

**Query Parameters:**
- `productId` (optional) - Validate for specific product

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Summer Sale",
    "discountPercentage": 20,
    "product": { ... }
  }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "message": "Invalid or expired promo code"
}
```

## Service Methods

### PromotionService Class

#### getAllPromotions(filters, pagination, branchConfig)
Retrieves paginated promotions with optional filters.

#### getPromotionById(id)
Fetches a single promotion by ID with product details.

#### createPromotion(data, transaction)
Creates a new promotion with validation:
- Validates dates
- Validates discounts
- Checks product existence
- Prevents overlapping promotions

#### updatePromotion(id, data, transaction)
Updates an existing promotion with validation.

#### deletePromotion(id, transaction)
Soft deletes a promotion (sets isDeleted=true, isActive=false).

#### getActivePromotionsForProduct(productId)
Returns currently active promotions for a specific product.

#### calculateDiscountedPrice(productId, originalPrice)
Calculates the discounted price based on active promotions.

#### validatePromoCode(promoCode, productId)
Validates a promotional code and returns promotion details.

## Controller Methods

All controller methods follow standard patterns:
- Input validation using express-validator
- Transaction management for data integrity
- Consistent error handling
- Standardized JSON responses

## Business Rules

### 1. Discount Types
- **Percentage Discount**: Applied as percentage of original price (0-100%)
- **Fixed Value Discount**: Applied as fixed amount subtracted from price
- Only one type should be specified per promotion

### 2. Date Management
- `endDate` must be after `startDate`
- Promotions are active only between start and end dates
- Past promotions remain in database but are not considered active

### 3. Overlap Prevention
- System prevents multiple active promotions for the same product during overlapping date ranges
- This ensures pricing consistency

### 4. Priority
When multiple promotions exist:
- Highest percentage discount is applied first
- Then highest fixed value discount

### 5. Soft Delete
- Deleted promotions are marked with `isDeleted=true`
- They are also deactivated (`isActive=false`)
- Historical data is preserved for reporting

## Usage Examples

### Example 1: Create a Percentage Discount
```javascript
POST /api/promotions
{
  "productId": 123,
  "title": "New Year Sale",
  "discountPercentage": 15,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "isActive": true
}
```

### Example 2: Create a Fixed Value Discount with Promo Code
```javascript
POST /api/promotions
{
  "productId": 456,
  "title": "Valentine's Special",
  "discountValue": 50,
  "promoCode": "LOVE50",
  "startDate": "2025-02-01T00:00:00Z",
  "endDate": "2025-02-14T23:59:59Z",
  "isActive": true
}
```

### Example 3: Get Active Promotions
```javascript
GET /api/promotions?isActive=true&page=1&limit=20
```

### Example 4: Calculate Discount in POS
```javascript
// In your POS/sales logic:
const result = await promotionService.calculateDiscountedPrice(
  productId,
  originalPrice
);

// Use result.discountedPrice for the sale
```

## Authentication & Authorization

All endpoints require:
- **Authentication**: Valid JWT token via `Bearer` token
- **Authorization**: Appropriate permissions:
  - `promotion:read` - View promotions
  - `promotion:create` - Create promotions
  - `promotion:update` - Update promotions
  - `promotion:delete` - Delete promotions

## Integration Points

### With Product Module
- Promotions link to products via `productId`
- Product details included in promotion responses

### With Sales/POS Module
- Use `calculateDiscountedPrice()` to apply promotions during sales
- Use `validatePromoCode()` for manual promo code entry

### With Inventory Module
- Promotions don't affect inventory directly
- Consider inventory levels when creating promotions

## Testing

### Manual Testing with Swagger
1. Start the server
2. Navigate to `http://localhost:3000/api-docs`
3. Find the "Promotions" section
4. Try out each endpoint with sample data

### Test Scenarios
1. ✅ Create promotion with percentage discount
2. ✅ Create promotion with fixed value discount
3. ✅ Try creating overlapping promotions (should fail)
4. ✅ Validate promo code
5. ✅ Calculate discounted price
6. ✅ Update promotion dates
7. ✅ Soft delete promotion
8. ✅ Filter promotions by date range

## Error Handling

Common error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Promotion not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Files Structure

```
src/
├── models/
│   └── promotion/
│       └── promotion.js              # Sequelize model
├── services/
│   └── promotion/
│       └── promotionService.js       # Business logic
├── controllers/
│   └── promotion/
│       └── promotionController.js    # Request handlers
└── routes/
    └── promotion/
        └── promotionRouter.js        # Route definitions + Swagger
```

## Future Enhancements

Potential features to add:
- [ ] Multi-product promotions (buy X get Y)
- [ ] Customer-specific promotions
- [ ] Usage limits for promo codes
- [ ] Tiered discounts (e.g., 10% off for 2+ items)
- [ ] Category-wide promotions
- [ ] Analytics dashboard for promotion effectiveness
- [ ] Scheduled promotion activation
- [ ] Email notifications for expiring promotions

## Notes

- All dates should be in ISO 8601 format
- Prices are stored with 2 decimal precision
- The system uses soft deletes to maintain historical data
- Transactions ensure data consistency across operations
- Swagger documentation is auto-generated from JSDoc comments

---

**Version:** 1.0.0  
**Last Updated:** December 30, 2025  
**Author:** DartCodes Development Team
