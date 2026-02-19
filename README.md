# POS System Backend API v2.0

A comprehensive, production-ready Point of Sale System backend built with Node.js, Express, MySQL, and Sequelize ORM. Features advanced inventory management, multi-company support, customer loyalty programs, and real-time sales tracking.

## 🚀 Key Features

- **Multi-Company Management** - Support for multiple companies/branches
- **Advanced Inventory System** - Real-time inventory tracking with batch numbers and expiry dates
- **Purchase Order Management** - Complete PO lifecycle from creation to GRN
- **Sales & POS** - Full-featured sales system with multiple payment methods
- **Customer Management** - Customer profiles with loyalty points and credit management
- **User & Roles** - Role-based access control with granular permissions
- **Supplier Management** - Supplier tracking with return management
- **Automated Batch Tracking** - Automatic batch number generation for GRN items
- **PDF Invoice Generation** - Professional PDF documents for invoices, POs, GRNs, and receipts
- **System Settings** - Configurable shop details, tax rates, and invoice customization
- **Audit Logging** - Comprehensive activity tracking
- **RESTful API** - Clean, well-documented REST endpoints
- **Swagger Documentation** - Auto-generated API documentation
- **Auto-Permission Generation** - Automatic permission creation from routes

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. Clone the repository and navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pos_db
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

5. Create the MySQL database:

```sql
CREATE DATABASE pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## ▶️ Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## 📚 API Documentation

Swagger documentation is automatically generated and available at:

- **Swagger UI**: `http://localhost:3000/api-docs`

The documentation includes all API endpoints with request/response schemas, parameters, and examples.

## 🏗️ Project Structure

```
server/
├── config/
│   ├── database.js          # Sequelize database configuration
│   └── swagger.js           # Swagger/OpenAPI configuration
├── controllers/             # Request handlers
│   ├── categories/
│   ├── companies/
│   ├── customers/
│   ├── customerRefund/
│   ├── grns/               # GRN with auto batch generation
│   ├── inventory/
│   ├── invoice/            # Invoice with PDF generation
│   ├── payments/
│   ├── products/
│   ├── purchaseOrders/     # PO with auto-GRN creation & PDF
│   ├── sales/              # Sales with PDF receipts
│   ├── settings/           # System settings controller
│   ├── suppliers/
│   └── users/
├── models/                  # Sequelize models
│   ├── categories/
│   ├── companies/
│   ├── customers/
│   ├── grns/
│   ├── inventory/
│   ├── products/
│   ├── purchaseOrders/
│   ├── sales/
│   ├── settings/           # System settings model
│   ├── suppliers/
│   └── users/
├── routes/                  # API routes
│   ├── index.js
│   ├── categories/
│   ├── companies/
│   ├── customers/
│   ├── grns/
│   ├── inventory/
│   ├── invoice/
│   ├── products/
│   ├── purchaseOrders/
│   ├── sales/
│   ├── settings/           # System settings routes
│   ├── suppliers/
│   └── users/
├── middleware/
│   ├── auth.js             # JWT authentication & authorization
│   └── auditLog.js         # Activity logging
├── seeders/
│   ├── autoPermissions.js  # Auto-generate permissions from routes
│   ├── defaultRoles.js     # Seed default roles
│   ├── defaultUser.js      # Create super admin
│   └── syncInventoryToLedger.js
├── utils/
│   ├── pdfGenerator.js     # PDF invoice generation
│   └── unitConverter.js    # Unit conversion utilities
├── docs/
│   ├── API.md              # Detailed API documentation
│   ├── CHANGELOG.md        # Version history
│   └── PDF_INVOICE_GUIDE.md # PDF generation guide
├── .env.example
├── package.json
├── README.md
└── server.js               # Main application entry point
```

## 🔌 API Endpoints Overview

### 🏥 Health & System
- `GET /` - API root
- `GET /api/health` - System health check and database status

### 👥 Users & Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login (returns JWT)
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/:id/permissions` - Get user permissions

### 🔐 Roles & Permissions
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `GET /api/permissions` - Get all permissions (auto-generated from routes)
- `POST /api/permissions/assign` - Assign permissions to user

### 🏢 Companies
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company by ID
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### 📦 Products & Inventory
- `GET /api/products` - Get all products (paginated, filtered)
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/brands` - Get all brands
- `POST /api/brands` - Create brand
- `GET /api/models` - Get all models
- `POST /api/models` - Create model
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category

### 🏪 Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier by ID
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `GET /api/supplier-returns` - Get supplier returns
- `POST /api/supplier-returns` - Create supplier return

### 📋 Purchase Orders
- `GET /api/purchase-orders` - Get all purchase orders
- `POST /api/purchase-orders` - Create purchase order
- `GET /api/purchase-orders/:id` - Get PO by ID
- `PUT /api/purchase-orders/:id` - Update PO (auto-creates GRN when status='completed')
- `DELETE /api/purchase-orders/:id` - Delete PO

### 📥 Goods Received Notes (GRN)
- `GET /api/grns` - Get all GRNs
- `POST /api/grns` - Create GRN (auto-generates batch numbers)
- `GET /api/grns/:id` - Get GRN by ID
- `PUT /api/grns/:id` - Update GRN (approving adds to inventory)
- `DELETE /api/grns/:id` - Delete GRN

### 📊 Inventory
- `GET /api/inventory` - Get inventory ledger
- `GET /api/inventory/stock-levels` - Get current stock levels
- `POST /api/inventory/adjust` - Manual inventory adjustment
- `GET /api/inventory/product/:id` - Get inventory for specific product

### 👤 Customers
- `GET /api/customers` - Get all customers (paginated)
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/:id/loyalty` - Get customer loyalty points
- `GET /api/customers/:id/credit` - Get customer credit balance

### 🛒 Sales & POS
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale/transaction
- `GET /api/sales/:id` - Get sale by ID
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Void sale

### 💰 Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Process payment
- `GET /api/payments/:id` - Get payment by ID
- `PUT /api/payments/:id/cancel` - Cancel payment

### 🧾 Customer Invoices & Refunds
- `GET /api/customer-invoices` - Get all invoices
- `POST /api/customer-invoices` - Create invoice
- `GET /api/customer-invoices/:id/pdf` - Generate invoice PDF
- `GET /api/customer-refunds` - Get all refunds
- `POST /api/customer-refunds` - Create refund
- `GET /api/customer-refund-items` - Get refund items

### 🖨️ PDF Generation
- `GET /api/customer-invoices/:id/pdf` - Generate customer invoice PDF
- `GET /api/purchase-orders/:id/pdf` - Generate purchase order PDF
- `GET /api/grns/:id/pdf` - Generate GRN PDF
- `GET /api/sales/:id/pdf` - Generate sales receipt PDF

### ⚙️ System Settings
- `GET /api/settings?companyId=1` - Get system settings
- `POST /api/settings` - Create or update system settings
- `DELETE /api/settings/:companyId` - Delete system settings

### 📜 Audit Logs
- `GET /api/audit-logs` - Get system audit logs (filtered by user, action, date)

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Login Example

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@possystem.com",
    "password": "admin123"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "userName": "admin",
    "email": "admin@possystem.com",
    "role": "super_admin"
  }
}
```

## 🎯 Key Workflows

### 1. Purchase Order to Inventory Flow

```
1. Create Purchase Order → POST /api/purchase-orders
2. Update PO status to 'completed' → PUT /api/purchase-orders/:id
   (Auto-creates GRN with batch numbers)
3. Approve GRN → PUT /api/grns/:id (status: 'approved')
   (Auto-updates inventory ledger)
```

### 2. Sales Transaction Flow

```
1. Create Sale → POST /api/sales
2. Process Payment → POST /api/payments
3. Generate Invoice → POST /api/customer-invoices
4. (Optional) Process Refund → POST /api/customer-refunds
```

### 3. Batch Number Auto-Generation

When completing a Purchase Order or creating a GRN:
- System automatically generates sequential batch numbers (BCH-0001, BCH-0002, etc.)
- Each product item receives a unique batch number
- Batch numbers are tracked through the entire inventory lifecycle

### 4. PDF Invoice Generation

```
1. Configure Shop Settings → POST /api/settings
   {
     "companyId": 1,
     "shopName": "My Store",
     "shopAddress": "123 Main St",
     "taxRate": 18.00
   }

2. Generate PDF Documents:
   - Customer Invoice → GET /api/customer-invoices/:id/pdf
   - Purchase Order → GET /api/purchase-orders/:id/pdf
   - GRN Document → GET /api/grns/:id/pdf
   - Sales Receipt → GET /api/sales/:id/pdf

3. PDFs include:
   - Shop details (name, address, contact)
   - Tax calculations based on system settings
   - Professional formatting with headers/footers
   - Company logo (if configured)
```

📖 **For detailed PDF generation guide, see:** [PDF Invoice Guide](./docs/PDF_INVOICE_GUIDE.md)

📊 **For Reporting & Excel Exports guide, see:** [Reports & Exports Guide](./docs/REPORTS_AND_EXPORTS.md)

## 📊 Pagination & Filtering

Most GET endpoints support pagination and filtering:

```bash
GET /api/products?page=1&limit=10&search=laptop&category=electronics&isActive=true
```

Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `search` - Search term
- Additional filters vary by endpoint

## 🔒 Permission System

Permissions are automatically generated from route files and follow the format:
- `{action}_{module}` (e.g., `view_products`, `create_sales`)

Common actions:
- `list` - View list of resources
- `view` - View single resource details
- `create` - Create new resource
- `update` - Modify existing resource
- `delete` - Remove resource
- `approve` - Approve transactions
- `cancel` - Cancel transactions

## 🧪 Example Requests

### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyId": 1,
    "name": "Laptop Dell XPS 15",
    "productCode": "PROD-001",
    "categoryId": 1,
    "brandId": 1,
    "costPrice": 1200.00,
    "sellingPrice": 1500.00,
    "unitOfMeasure": "PCS",
    "minStockLevel": 5,
    "isActive": true
  }'
```

### Complete Purchase Order (Auto-creates GRN with Batch Numbers)

```bash
curl -X PUT http://localhost:3000/api/purchase-orders/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "notes": "Order received and GRN created"
  }'
```

### Create Sale

```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyId": 1,
    "customerId": 1,
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "unitPrice": 1500.00,
        "discount": 0
      }
    ],
    "paymentMethod": "cash",
    "totalAmount": 3000.00
  }'
```
├── README.md
└── server.js               # Main application entry point
```
├── package.json
├── README.md
└── server.js           # Main application entry point
```

## API Endpoints

### Health Check

- `GET /api/health` - Check API and database status

### Products

All product endpoints support full CRUD operations:

- `GET /api/products` - Get all products (with pagination and filtering)
  - Query parameters: `page`, `limit`, `category`, `isActive`
- `GET /api/products/:id` - Get a single product by ID
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product

#### Product Schema

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "price": "number (required, min: 0)",
  "stock": "integer (optional, default: 0, min: 0)",
  "sku": "string (optional, unique)",
  "category": "string (optional)",
  "isActive": "boolean (optional, default: true)"
}
```

#### Example: Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "stock": 50,
    "sku": "LAP-001",
    "category": "Electronics",
    "isActive": true
  }'
```

## Adding New Models

1. Create a model file in the `models/` directory:

```javascript
// models/User.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });

  return User;
};
```

2. Import and register the model in `models/index.js`:

```javascript
const User = require("./User")(sequelize, Sequelize);
db.User = User;
```

## Adding New Routes

1. Create a route file in the `routes/` directory with Swagger annotations:

```javascript
// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { checkPermission } = require("../middleware/auth");

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/", checkPermission('list_user'), userController.getAllUsers);

module.exports = router;
```

2. Import the route in `routes/index.js`:

```javascript
router.use("/users", require("./userRoutes"));
```

3. The Swagger documentation will automatically include your new routes when you add the `@swagger` annotations.

## 🚀 Auto-Permission Generation

The system automatically scans all route files on startup and generates permissions:

1. Scans `routes/` directory for all `*Routes.js` and `*Router.js` files
2. Extracts HTTP methods and endpoints
3. Creates permissions with format `{action}_{module}`
4. Updates permission database
5. Assigns all permissions to super admin users

Example generated permissions:
- `GET /api/products` → `list_product`
- `POST /api/sales` → `create_sale`
- `PUT /api/purchase-orders/:id/approve` → `approve_purchase_order`

## 🗄️ Database Management

### Auto-Sync (Development Only)

In development mode, Sequelize automatically syncs models with database:

```javascript
await sequelize.sync({ alter: false });
```

### Production Setup

For production, disable auto-sync and use migrations:

1. Set `NODE_ENV=production` in `.env`
2. Use Sequelize CLI for migrations:

```bash
npm install --save-dev sequelize-cli
npx sequelize-cli migration:generate --name add-new-feature
npx sequelize-cli db:migrate
```

### Default Data Seeding

On first startup, the system automatically:
1. Creates default roles (super_admin, admin, manager, cashier, viewer)
2. Creates super admin user (check `seeders/defaultUser.js` for credentials)
3. Generates all permissions from route files
4. Assigns permissions to super admin

## 🔍 Troubleshooting

### Database Connection Issues

```bash
Error: Access denied for user 'root'@'localhost'
```
**Solution**: Check database credentials in `.env` file

### JWT Token Errors

```bash
Error: jwt malformed
```
**Solution**: Ensure you're sending token in format `Bearer <token>`

### Permission Denied

```bash
Error: You don't have permission to access this resource
```
**Solution**: Check user role and assigned permissions. Super admin has all permissions.

### Batch Numbers Not Generated

**Solution**: Ensure you're completing PO with status='completed' or creating GRN through proper endpoints

## 📈 Performance Tips

1. **Pagination**: Always use pagination for large datasets
2. **Indexing**: Database indexes are automatically created on frequently queried fields
3. **Connection Pooling**: Sequelize uses connection pooling by default
4. **Caching**: Consider implementing Redis for frequently accessed data
5. **Batch Operations**: Use bulk operations for multiple inserts/updates

## 🔐 Security Best Practices

1. **JWT Secrets**: Use strong, unique JWT secrets in production
2. **Environment Variables**: Never commit `.env` file to version control
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: All inputs are validated using express-validator
6. **SQL Injection**: Sequelize ORM protects against SQL injection
7. **Password Hashing**: Passwords are hashed using bcrypt

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@possystem.com or open an issue on GitHub.

## 🎉 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Database ORM by [Sequelize](https://sequelize.org/)
- API Documentation by [Swagger](https://swagger.io/)
- Authentication with [JWT](https://jwt.io/)

---

**Version**: 2.0.0  
**Last Updated**: December 2025  
**Status**: Production Ready ✅
