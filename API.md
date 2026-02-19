# API Reference - POS System v2.0

Complete API endpoint reference with request/response examples.

## Base URL

```
Development: http://localhost:3000
Production: https://api.possystem.com
```

## Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get token by logging in:
```bash
POST /api/users/login
```
test
---

## 📑 Table of Contents

- [Health & System](#health--system)
- [Authentication](#authentication-endpoints)
- [Users](#users)
- [Roles & Permissions](#roles--permissions)
- [Companies](#companies)
- [Categories](#categories)
- [Brands & Models](#brands--models)
- [Products](#products)
- [Suppliers](#suppliers)
- [Purchase Orders](#purchase-orders)
- [GRN (Goods Received Notes)](#grn-goods-received-notes)
- [Inventory](#inventory)
- [Customers](#customers)
- [Sales](#sales)
- [Payments](#payments)
- [Invoices & Refunds](#invoices--refunds)
- [Audit Logs](#audit-logs)

---

## Health & System

### Check API Health
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-12-08T10:30:00.000Z",
  "database": "connected"
}
```

---

## Authentication Endpoints

### Register User
```http
POST /api/users/register
```

**Request Body:**
```json
{
  "userName": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "0771234567",
  "roleId": 2,
  "companyId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 5,
    "userName": "john_doe",
    "email": "john@example.com"
  }
}
```

### Login
```http
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "admin@possystem.com",
  "password": "admin123"
}
```

**Response:**
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

---

## Users

### Get All Users
```http
GET /api/users?page=1&limit=10&search=john
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10)
- `search` (string): Search by username or email

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

### Get User by ID
```http
GET /api/users/:id
```

### Update User
```http
PUT /api/users/:id
```

### Delete User
```http
DELETE /api/users/:id
```

### Get User Permissions
```http
GET /api/users/:id/permissions
```

---

## Roles & Permissions

### Get All Roles
```http
GET /api/roles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "super_admin",
      "displayName": "Super Administrator",
      "description": "Full system access"
    }
  ]
}
```

### Create Role
```http
POST /api/roles
```

**Request Body:**
```json
{
  "name": "manager",
  "displayName": "Store Manager",
  "description": "Manage store operations"
}
```

### Get All Permissions
```http
GET /api/permissions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "list_product",
      "displayName": "List Products",
      "module": "product",
      "isActive": true
    }
  ]
}
```

### Assign Permissions to User
```http
POST /api/permissions/assign
```

**Request Body:**
```json
{
  "userId": 5,
  "permissionIds": [1, 2, 3, 4, 5]
}
```

---

## Companies

### Get All Companies
```http
GET /api/companies?page=1&limit=10
```

### Create Company
```http
POST /api/companies
```

**Request Body:**
```json
{
  "name": "ABC Store",
  "address": "123 Main St, Colombo",
  "phone": "0112345678",
  "email": "info@abcstore.com",
  "registrationNumber": "REG-2025-001",
  "isActive": true
}
```

### Get Company by ID
```http
GET /api/companies/:id
```

### Update Company
```http
PUT /api/companies/:id
```

### Delete Company
```http
DELETE /api/companies/:id
```

---

## Categories

### Get All Categories
```http
GET /api/categories
```

### Create Category
```http
POST /api/categories
```

**Request Body:**
```json
{
  "companyId": 1,
  "categoryName": "Electronics",
  "description": "Electronic devices and accessories",
  "isActive": true
}
```

---

## Brands & Models

### Get All Brands
```http
GET /api/brands
```

### Create Brand
```http
POST /api/brands
```

**Request Body:**
```json
{
  "companyId": 1,
  "brandName": "Dell",
  "description": "Dell computers and accessories"
}
```

### Get All Models
```http
GET /api/models
```

### Create Model
```http
POST /api/models
```

**Request Body:**
```json
{
  "companyId": 1,
  "brandId": 1,
  "modelName": "XPS 15",
  "description": "High-performance laptop"
}
```

---

## Products

### Get All Products
```http
GET /api/products?page=1&limit=10&search=laptop&category=1&isActive=true
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search in name, code, description
- `category`: Filter by category ID
- `isActive`: Filter by active status

### Create Product
```http
POST /api/products
```

**Request Body:**
```json
{
  "companyId": 1,
  "name": "Dell XPS 15 Laptop",
  "productCode": "PROD-001",
  "categoryId": 1,
  "brandId": 1,
  "modelId": 1,
  "description": "15-inch laptop with Intel i7",
  "costPrice": 1200.00,
  "sellingPrice": 1500.00,
  "mrp": 1600.00,
  "unitOfMeasure": "PCS",
  "minStockLevel": 5,
  "reorderLevel": 10,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 15,
    "productCode": "PROD-001",
    "name": "Dell XPS 15 Laptop",
    ...
  }
}
```

### Get Product by ID
```http
GET /api/products/:id
```

### Update Product
```http
PUT /api/products/:id
```

### Delete Product
```http
DELETE /api/products/:id
```

---

## Suppliers

### Get All Suppliers
```http
GET /api/suppliers?page=1&limit=10&search=tech
```

### Create Supplier
```http
POST /api/suppliers
```

**Request Body:**
```json
{
  "companyId": 1,
  "supplierCode": "SUP-001",
  "name": "Tech Distributors Ltd",
  "contactPerson": "John Silva",
  "email": "john@techdist.lk",
  "phone": "0771234567",
  "address": "45 Industrial Zone, Colombo",
  "isActive": true
}
```

### Get Supplier by ID
```http
GET /api/suppliers/:id
```

### Update Supplier
```http
PUT /api/suppliers/:id
```

### Delete Supplier
```http
DELETE /api/suppliers/:id
```

---

## Purchase Orders

### Get All Purchase Orders
```http
GET /api/purchase-orders?page=1&limit=10&status=pending
```

**Query Parameters:**
- `status`: pending, approved, completed, cancelled

### Create Purchase Order
```http
POST /api/purchase-orders
```

**Request Body:**
```json
{
  "companyId": 1,
  "supplierId": 1,
  "poNumber": "PO-0001",
  "poDate": "2025-12-08",
  "expectedDeliveryDate": "2025-12-15",
  "notes": "Urgent order",
  "items": [
    {
      "productId": 1,
      "quantityOrdered": 20,
      "unitCost": 1200.00
    },
    {
      "productId": 2,
      "quantityOrdered": 10,
      "unitCost": 800.00
    }
  ]
}
```

### Get Purchase Order by ID
```http
GET /api/purchase-orders/:id
```

### Update Purchase Order (Complete)
```http
PUT /api/purchase-orders/:id
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Order received and processed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase order completed and GRN created successfully",
  "data": {
    "id": 2,
    "poNumber": "PO-0002",
    "status": "completed",
    ...
  }
}
```

**Note:** When status changes to "completed", a GRN is automatically created with batch numbers for all items.

---

## GRN (Goods Received Notes)

### Get All GRNs
```http
GET /api/grns?page=1&limit=10&status=draft
```

### Create GRN
```http
POST /api/grns
```

**Request Body:**
```json
{
  "companyId": 1,
  "poId": 2,
  "supplierId": 1,
  "receivedDate": "2025-12-08",
  "inspectionNotes": "All items received in good condition",
  "items": [
    {
      "poItemId": 3,
      "productId": 1,
      "quantityReceived": 20,
      "quantityAccepted": 20,
      "quantityRejected": 0,
      "unitCost": 1200.00,
      "sellingPrice": 1500.00,
      "mrp": 1600.00,
      "expiryDate": "2026-12-31"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "GRN created successfully",
  "data": {
    "id": 5,
    "grnNumber": "GRN-000005",
    ...
  }
}
```

**Note:** Batch numbers (BCH-0001, BCH-0002, etc.) are automatically generated for each item.

### Get GRN by ID
```http
GET /api/grns/:id
```

**Response includes batch numbers:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "grnNumber": "GRN-000005",
    "items": [
      {
        "id": 10,
        "productId": 1,
        "batchNumber": "BCH-0015",
        "quantityAccepted": 20,
        ...
      }
    ]
  }
}
```

### Update GRN (Approve)
```http
PUT /api/grns/:id
```

**Request Body:**
```json
{
  "status": "approved",
  "inspectionNotes": "Inspection completed, all items approved"
}
```

**Note:** When status changes to "approved", inventory is automatically updated with the accepted quantities.

---

## Inventory

### Get Inventory Ledger
```http
GET /api/inventory?page=1&limit=10&productId=1&startDate=2025-12-01
```

### Get Stock Levels
```http
GET /api/inventory/stock-levels?companyId=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": 1,
      "productName": "Dell XPS 15",
      "totalStock": 45,
      "batches": [
        {
          "batchNumber": "BCH-0015",
          "quantity": 20,
          "expiryDate": "2026-12-31"
        }
      ]
    }
  ]
}
```

### Manual Inventory Adjustment
```http
POST /api/inventory/adjust
```

**Request Body:**
```json
{
  "productId": 1,
  "quantity": 5,
  "adjustmentType": "in",
  "reason": "Stock correction",
  "batchNumber": "BCH-0020"
}
```

---

## Customers

### Get All Customers
```http
GET /api/customers?page=1&limit=10&search=john&customerType=retail
```

### Create Customer
```http
POST /api/customers
```

**Request Body:**
```json
{
  "customerName": "John Doe",
  "phone": "0771234567",
  "address": "123 Main Street, Colombo",
  "customerType": "retail",
  "creditLimit": 10000.00,
  "discountPercentage": 5.00,
  "notes": "VIP customer"
}
```

### Get Customer by ID
```http
GET /api/customers/:id
```

### Get Customer Loyalty Points
```http
GET /api/customers/:id/loyalty
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": 5,
    "loyaltyPoints": 1250,
    "totalPurchases": 45000.00,
    "lastPurchaseDate": "2025-12-07"
  }
}
```

### Get Customer Credit Balance
```http
GET /api/customers/:id/credit
```

---

## Sales

### Get All Sales
```http
GET /api/sales?page=1&limit=10&startDate=2025-12-01&endDate=2025-12-08
```

### Create Sale
```http
POST /api/sales
```

**Request Body:**
```json
{
  "companyId": 1,
  "customerId": 5,
  "saleDate": "2025-12-08",
  "items": [
    {
      "productId": 1,
      "batchNumber": "BCH-0015",
      "quantity": 2,
      "unitPrice": 1500.00,
      "discount": 100.00
    }
  ],
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": 2900.00
    }
  ],
  "totalAmount": 2900.00,
  "discountAmount": 100.00,
  "notes": "Walk-in customer"
}
```

### Get Sale by ID
```http
GET /api/sales/:id
```

### Void Sale
```http
DELETE /api/sales/:id
```

---

## Payments

### Get All Payments
```http
GET /api/payments?page=1&limit=10&paymentMethod=cash
```

### Process Payment
```http
POST /api/payments
```

**Request Body:**
```json
{
  "saleId": 10,
  "customerId": 5,
  "paymentMethod": "card",
  "amount": 2900.00,
  "reference": "CARD-TXN-12345",
  "notes": "Credit card payment"
}
```

### Cancel Payment
```http
PUT /api/payments/:id/cancel
```

---

## Invoices & Refunds

### Create Customer Invoice
```http
POST /api/customer-invoices
```

### Get All Customer Refunds
```http
GET /api/customer-refunds
```

### Create Customer Refund
```http
POST /api/customer-refunds
```

**Request Body:**
```json
{
  "saleId": 10,
  "customerId": 5,
  "refundDate": "2025-12-08",
  "items": [
    {
      "saleItemId": 15,
      "productId": 1,
      "quantityReturned": 1,
      "refundAmount": 1450.00,
      "reason": "Defective product"
    }
  ],
  "totalRefundAmount": 1450.00,
  "refundMethod": "cash"
}
```

---

## Audit Logs

### Get Audit Logs
```http
GET /api/audit-logs?page=1&limit=20&userId=1&action=create&startDate=2025-12-01
```

**Query Parameters:**
- `userId`: Filter by user
- `action`: create, update, delete, login, etc.
- `startDate`, `endDate`: Date range
- `module`: Filter by module (product, sale, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 150,
      "userId": 1,
      "action": "create",
      "module": "sale",
      "description": "Created new sale #45",
      "ipAddress": "192.168.1.100",
      "createdAt": "2025-12-08T10:30:00.000Z"
    }
  ],
  "total": 1500,
  "page": 1,
  "limit": 20
}
```

---

## Common Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

API calls are limited to:
- 100 requests per minute per IP (development)
- 1000 requests per hour per authenticated user (production)

---

**For interactive API testing, visit:** `http://localhost:3000/api-docs`
