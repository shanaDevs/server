# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-08

### 🎉 Major Release - Production Ready

### Added
- **Auto-Permission Generation**: Automatically scans route files and generates permissions on server startup
- **Batch Number Auto-Generation**: Automatic sequential batch number generation (BCH-0001, BCH-0002, etc.) for GRN items
- **Auto-GRN Creation**: Purchase orders automatically create GRN with batch numbers when status changes to 'completed'
- **Multi-Company Support**: Full multi-company/branch management system
- **Customer Loyalty System**: Customer loyalty points tracking and management
- **Customer Credit Management**: Credit limit and balance tracking for customers
- **Inventory Ledger**: Real-time inventory tracking with comprehensive ledger system
- **Audit Logging**: Complete activity tracking for all critical operations
- **Product Audit Logs**: Track all product changes including price updates and stock adjustments
- **Supplier Returns**: Supplier return and replacement management
- **Customer Refunds**: Customer refund processing with item-level tracking
- **Payment Processing**: Multiple payment methods with transaction management
- **Brand & Model Management**: Separate management for product brands and models
- **Advanced Filtering**: Enhanced filtering and search across all endpoints
- **Comprehensive Swagger Documentation**: Auto-generated API documentation with schemas and examples
- **Role-Based Access Control**: Granular permission system with role management
- **JWT Authentication**: Secure authentication with token-based access

### Enhanced
- **README.md**: Comprehensive documentation with API endpoints, workflows, and examples
- **Swagger Configuration**: Added common schemas, responses, and parameters
- **Package.json**: Updated metadata, version, and keywords
- **Server Startup**: Enhanced startup logging with API documentation links
- **Error Handling**: Improved error responses with validation details
- **Response Format**: Standardized success and error response formats

### Fixed
- **Customer Model**: Removed duplicate email index that was causing sync errors
- **GRN Batch Numbers**: Fixed batch number generation in Purchase Order completion flow
- **Permission Assignment**: Fixed super admin permission assignment using setPermissions instead of addPermissions
- **Git Case Sensitivity**: Resolved duplicate customer.js/Customer.js file conflict

### Security
- **Password Hashing**: Bcrypt password hashing for user authentication
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: Express-validator on all input endpoints
- **SQL Injection Protection**: Sequelize ORM query parameterization
- **Permission Checks**: Middleware-based permission verification

### Database Schema
- **20+ Models**: Complete database schema for POS operations
  - Users, Roles, Permissions
  - Companies, Categories, Brands, Models
  - Products, Suppliers, Customers
  - Purchase Orders, GRN, GRN Items
  - Inventory, Inventory Ledger
  - Sales, Sale Items, Sale Payments
  - Payments, Customer Invoices
  - Customer Refunds, Supplier Returns
  - Audit Logs, Product Audit Logs

### API Endpoints (100+ Routes)
- **Health & System**: 2 endpoints
- **Users & Auth**: 8 endpoints
- **Roles & Permissions**: 8 endpoints
- **Companies**: 5 endpoints
- **Products**: 25+ endpoints (including brands, models, categories)
- **Suppliers**: 10+ endpoints
- **Purchase Orders**: 5 endpoints
- **GRN**: 5 endpoints
- **Inventory**: 10+ endpoints
- **Customers**: 10+ endpoints
- **Sales**: 10+ endpoints
- **Payments**: 5 endpoints
- **Invoices & Refunds**: 10+ endpoints
- **Audit Logs**: 3 endpoints

### Workflows Implemented
1. **Purchase-to-Inventory Flow**
   - Create PO → Complete PO → Auto-create GRN → Approve GRN → Update Inventory
2. **Sales Flow**
   - Create Sale → Process Payment → Generate Invoice → (Optional) Process Refund
3. **Customer Management**
   - Register Customer → Track Purchases → Update Loyalty Points → Manage Credit

### Developer Experience
- **Auto-reload**: Nodemon for development
- **Code Organization**: Modular structure with controllers, models, routes
- **Validation**: Express-validator middleware
- **Logging**: Morgan for request logging
- **Documentation**: Inline Swagger annotations
- **Seeders**: Auto-generate default data and permissions

### Performance
- **Pagination**: All list endpoints support pagination
- **Indexing**: Database indexes on frequently queried fields
- **Connection Pooling**: Sequelize connection pool configuration
- **Bulk Operations**: Batch inserts for better performance

---

## [1.0.0] - 2025-12-05

### Initial Release
- Basic Express.js server setup
- MySQL database with Sequelize ORM
- Basic product CRUD operations
- Swagger documentation foundation
- Environment configuration
- Basic error handling

---

## Release Notes

### Upgrading from v1.0.0 to v2.0.0

**Breaking Changes:**
- Customer model: Email field is now optional
- Authentication: All endpoints now require JWT token (except login/register)
- Response format: Standardized JSON response structure

**Migration Steps:**
1. Update `.env` file with JWT_SECRET and JWT_EXPIRES_IN
2. Run `npm install` to update dependencies
3. Database will auto-sync on first startup (development mode)
4. Default super admin user will be created automatically
5. Permissions will be auto-generated from routes

**New Environment Variables:**
```env
JWT_SECRET=your_secure_secret_key
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

---

**For detailed API documentation, visit:** `http://localhost:3000/api-docs`

**For support or issues:** Open an issue on GitHub or contact support@possystem.com
