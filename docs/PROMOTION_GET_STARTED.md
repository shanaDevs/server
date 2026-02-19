# 🚀 Promotion Module - Get Started in 5 Minutes

## Step 1: Verify Setup ✅

The promotion module is already integrated! Just verify your server is running:

```bash
# Start the server
npm start
# or
node server.js
```

## Step 2: Access Swagger UI 📖

Open your browser:
```
http://localhost:3000/api-docs
```

Scroll down to the **"Promotions"** section.

## Step 3: Authenticate 🔐

1. In Swagger UI, find the `/api/users/login` endpoint
2. Click "Try it out"
3. Enter your credentials:
   ```json
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```
4. Click "Execute"
5. Copy the `token` from the response
6. Click the **"Authorize"** button at the top of the page
7. Paste your token and click "Authorize"

## Step 4: Create Your First Promotion 🎉

1. Find `POST /api/promotions` in the Promotions section
2. Click "Try it out"
3. Use this sample data:
   ```json
   {
     "productId": 1,
     "title": "My First Promotion",
     "description": "20% off this amazing product!",
     "discountPercentage": 20,
     "startDate": "2025-01-01T00:00:00Z",
     "endDate": "2025-12-31T23:59:59Z",
     "isActive": true
   }
   ```
4. Click "Execute"
5. Check the response - you should see status **201 Created**!

## Step 5: View Your Promotion 👀

1. Find `GET /api/promotions` endpoint
2. Click "Try it out"
3. Click "Execute"
4. You'll see your promotion in the response!

## 🎯 Quick Examples

### Create 25% Discount
```json
{
  "productId": 5,
  "title": "Flash Sale",
  "discountPercentage": 25,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z"
}
```

### Create $50 Off
```json
{
  "productId": 10,
  "title": "Special Offer",
  "discountValue": 50,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

### With Promo Code
```json
{
  "productId": 15,
  "title": "VIP Discount",
  "discountPercentage": 15,
  "promoCode": "VIP15",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

## 🔥 Cool Features to Try

### Calculate Discount
```
GET /api/promotions/product/1/calculate?originalPrice=100
```
Returns the discounted price based on active promotions!

### Validate Promo Code
```
GET /api/promotions/validate/VIP15
```
Check if a promo code is valid!

### Filter Active Promotions
```
GET /api/promotions?isActive=true
```
Only show active promotions!

## 🎨 Using in Your Code

### In a Sales Controller
```javascript
const promotionService = require('./services/promotion/promotionService');

// Calculate discount
const priceInfo = await promotionService.calculateDiscountedPrice(
  productId,
  100  // original price
);

console.log(`Original: $${priceInfo.originalPrice}`);
console.log(`Discounted: $${priceInfo.discountedPrice}`);
console.log(`You save: $${priceInfo.discount}`);
```

### Check Promo Code
```javascript
const result = await promotionService.validatePromoCode('SUMMER20', productId);

if (result.valid) {
  console.log('Valid promo code!');
  console.log('Promotion:', result.promotion.title);
} else {
  console.log('Invalid code');
}
```

## 📝 Important Notes

⚠️ **Make sure:**
- Product ID exists in your database
- End date is after start date
- Either `discountPercentage` OR `discountValue` is provided (not both!)
- Discount percentage is between 0-100

## 🎓 Next Steps

- **Full Documentation:** `docs/PROMOTIONS_MODULE.md`
- **Quick Reference:** `docs/PROMOTIONS_QUICK_REF.md`
- **Test All Endpoints:** Use Swagger UI at `/api-docs`

## 🆘 Troubleshooting

### "Product not found"
→ Change `productId` to an existing product in your database

### "Unauthorized"
→ Make sure you're authenticated (see Step 3)

### "An active promotion already exists"
→ There's already a promotion for this product in this date range

## 🎉 You're Ready!

The promotion module is fully set up and ready to use. Start creating promotions and boost your sales! 

**Happy promoting!** 🚀

---

**Need Help?** Check the full documentation in `docs/PROMOTIONS_MODULE.md`
