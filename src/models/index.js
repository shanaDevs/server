const { sequelize, Sequelize } = require('../config/database');


// Import models
const Product = require('./products/Product')(sequelize, Sequelize);
const User = require('./users/User')(sequelize, Sequelize);
const Role = require('./users/Role')(sequelize, Sequelize);
const AuditLog = require('./users/AuditLog')(sequelize, Sequelize);
const Permission = require('./users/Permission')(sequelize, Sequelize);
const UserPermission = require('./users/UserPermission')(sequelize, Sequelize);
const Suppliers = require('./suppliers/suppliers')(sequelize, Sequelize);
const Companies = require('./companies/compnaies')(sequelize, Sequelize);
const Category = require('./categories/Category')(sequelize, Sequelize);
const PurchaseOrder = require('./purchaseOrders/PurchaseOrder')(sequelize, Sequelize);
const PurchaseOrderItem = require('./purchaseOrders/PurchaseOrderItem')(sequelize, Sequelize);
const GRN = require('./grns/GRN')(sequelize, Sequelize);
const GRNItem = require('./grns/GRNItem')(sequelize, Sequelize);
const Inventory = require('./inventory/Inventory')(sequelize, Sequelize);
const InventoryLedger = require('./inventory/InventoryLedger')(sequelize, Sequelize);
const Location = require('./inventory/Location')(sequelize, Sequelize);
const ProductAuditLog = require('./products/ProductAuditLog')(sequelize, Sequelize);
const Customer = require('./customers/Customer')(sequelize, Sequelize);
const CustomerLoyalty = require('./customers/CustomerLoyalty')(sequelize, Sequelize);
const CustomerCredit = require('./customers/CustomerCredit')(sequelize, Sequelize);
const CustomerPurchaseHistory = require('./customers/CustomerPurchaseHistory')(sequelize, Sequelize);
const Payment = require('./payment/payment')(sequelize, Sequelize);
const Sale = require('./sales/Sale')(sequelize, Sequelize);
const SaleItem = require('./sales/SaleItem')(sequelize, Sequelize);
const SalePayment = require('./sales/SalePayment')(sequelize, Sequelize);
const SupplierReturn = require('./suppliers/SupplierReturn')(sequelize, Sequelize);
const Brand = require('./products/brand')(sequelize, Sequelize);
const CustomerRefund = require('./customerRefund/CustomerRefund')(sequelize, Sequelize);
const CustomerRefundItem = require('./customerRefund/CustomerRefundItem')(sequelize, Sequelize);
const SystemSettings = require('./settings/SystemSettings')(sequelize, Sequelize);
const Branch = require('./branches/Branch')(sequelize, Sequelize);
const UserBranch = require('./branches/UserBranch')(sequelize, Sequelize);
const EmailLog = require('./emails/EmailLog')(sequelize, Sequelize);
const Repairs = require('./repairs/Repairs')(sequelize, Sequelize);
const CustomerDiscount = require('./customers/CustomerDiscount')(sequelize, Sequelize);
const NotificationLog = require('./customers/NotificationLog')(sequelize, Sequelize);
const Promotion = require('./promotion/promotion')(sequelize, Sequelize);
const Sms = require('./sms/sms')(sequelize, Sequelize);
const Expense = require('./expenses/Expense')(sequelize, Sequelize);
const Counter = require('./sales/Counter')(sequelize, Sequelize);
const CounterSession = require('./sales/CounterSession')(sequelize, Sequelize);
const SalePromotion = require('./sales/SalePromotion')(sequelize, Sequelize);
const SaleReturnItem = require('./sales/SaleReturnItem')(sequelize, Sequelize);
const PromotionItem = require('./promotion/promotionItems')(sequelize, Sequelize);
const SupplierPayment = require('./suppliers/SupplierPayment')(sequelize, Sequelize);
const SupplierCredit = require('./suppliers/SupplierCredit')(sequelize, Sequelize);
const HeldBill = require('./sales/HeldBill')(sequelize, Sequelize);
const SupplierReturnPayment = require('./returns/SupplierReturnPayment')(sequelize, Sequelize);
const CustomerReturnPayment = require('./returns/CustomerReturnPayment')(sequelize, Sequelize);

// Branch relationships
Branch.belongsToMany(User, {
    through: UserBranch,
    foreignKey: 'branchId',
    otherKey: 'userId',
    as: 'users'
});

User.belongsToMany(Branch, {
    through: UserBranch,
    foreignKey: 'userId',
    otherKey: 'branchId',
    as: 'branches'
});

// User default branch relationship
User.belongsTo(Branch, {
    foreignKey: 'defaultBranchId',
    as: 'defaultBranch'
});

Branch.hasMany(User, {
    foreignKey: 'defaultBranchId',
    as: 'defaultUsers'
});

// User created by branch relationship
User.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'createdByBranch'
});

Branch.hasMany(User, {
    foreignKey: 'branchId',
    as: 'createdUsers'
});

// UserBranch direct associations
UserBranch.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

UserBranch.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

// User & Role relationship
User.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role'
});

Role.hasMany(User, {
    foreignKey: 'roleId',
    as: 'users'
});

// User & Permission relationships
User.belongsToMany(Permission, {
    through: UserPermission,
    foreignKey: 'userId',
    otherKey: 'permissionId',
    as: 'permissions'
});

Permission.belongsToMany(User, {
    through: UserPermission,
    foreignKey: 'permissionId',
    otherKey: 'userId',
    as: 'users'
});

// Category relationships
Category.belongsTo(Category, {
    foreignKey: 'parentId',
    as: 'parent'
});

Category.hasMany(Category, {
    foreignKey: 'parentId',
    as: 'subcategories'
});

// Supplier relationships
Suppliers.belongsTo(Companies, {
    foreignKey: 'companyId',
    as: 'company'
});

Companies.hasMany(Suppliers, {
    foreignKey: 'companyId',
    as: 'suppliers'
});

// Product relationships

Product.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category'
});

Product.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

Product.hasMany(Inventory, {
    foreignKey: 'productId',
    as: 'inventories'
});


Suppliers.hasMany(Product, {
    foreignKey: 'supplierId',
    as: 'products'
});

Suppliers.hasMany(GRN, {
    foreignKey: 'supplierId',
    as: 'grns'
});


PurchaseOrder.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

PurchaseOrder.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

PurchaseOrder.hasMany(PurchaseOrderItem, {
    foreignKey: 'poId',
    as: 'items'
});

// Purchase Order Item relationships
PurchaseOrderItem.belongsTo(PurchaseOrder, {
    foreignKey: 'poId',
    as: 'purchaseOrder'
});

PurchaseOrderItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// GRN relationships

GRN.belongsTo(PurchaseOrder, {
    foreignKey: 'poId',
    as: 'purchaseOrder'
});

GRN.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

GRN.belongsTo(User, {
    foreignKey: 'receivedBy',
    as: 'receiver'
});

GRN.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
});

GRN.hasMany(GRNItem, {
    foreignKey: 'grnId',
    as: 'items'
});

// GRN Item relationships
GRNItem.belongsTo(GRN, {
    foreignKey: 'grnId',
    as: 'grn'
});

GRNItem.belongsTo(PurchaseOrderItem, {
    foreignKey: 'poItemId',
    as: 'purchaseOrderItem'
});

GRNItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

GRNItem.belongsTo(Location, {
    foreignKey: 'locationId',
    as: 'location'
});

// Inventory relationships
Inventory.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

Inventory.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

Inventory.belongsTo(GRN, {
    foreignKey: 'grnId',
    as: 'grn'
});

Inventory.belongsTo(Location, {
    foreignKey: 'locationId',
    as: 'location'
});

// Location relationships
Location.belongsTo(Location, {
    foreignKey: 'parentLocationId',
    as: 'parentLocation'
});

Location.hasMany(Location, {
    foreignKey: 'parentLocationId',
    as: 'childLocations'
});

// Product Audit Log relationships
ProductAuditLog.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

ProductAuditLog.belongsTo(User, {
    foreignKey: 'changedBy',
    as: 'user'
});

// Customer relationships
Customer.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

Customer.hasMany(CustomerLoyalty, {
    foreignKey: 'customerId',
    as: 'loyaltyTransactions'
});

Customer.hasMany(CustomerCredit, {
    foreignKey: 'customerId',
    as: 'creditTransactions'
});

Customer.hasMany(CustomerPurchaseHistory, {
    foreignKey: 'customerId',
    as: 'purchaseHistory'
});

// CustomerLoyalty relationships
CustomerLoyalty.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

CustomerLoyalty.belongsTo(User, {
    foreignKey: 'performedBy',
    as: 'user'
});

// CustomerCredit relationships
CustomerCredit.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

CustomerCredit.belongsTo(User, {
    foreignKey: 'performedBy',
    as: 'user'
});

// CustomerPurchaseHistory relationships
CustomerPurchaseHistory.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

// Payment & User relationship
Payment.belongsTo(User, {
    foreignKey: 'createdBy', // Payment.createdBy is FK
    as: 'creator'
});

User.hasMany(Payment, {
    foreignKey: 'createdBy',
    as: 'payments'
});

CustomerPurchaseHistory.belongsTo(Sale, {
    foreignKey: 'saleId',
    as: 'sale'
});

// Sale relationships
Sale.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

Sale.belongsTo(User, {
    foreignKey: 'cashierId',
    as: 'cashier'
});

Sale.hasMany(SaleItem, {
    foreignKey: 'saleId',
    as: 'items'
});

Sale.hasMany(SalePayment, {
    foreignKey: 'saleId',
    as: 'payments'
});

Sale.hasMany(CustomerPurchaseHistory, {
    foreignKey: 'saleId',
    as: 'purchaseHistory'
});

// SaleItem relationships
SaleItem.belongsTo(Sale, {
    foreignKey: 'saleId',
    as: 'sale'
});

SaleItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// SalePayment relationships
SalePayment.belongsTo(Sale, {
    foreignKey: 'saleId',
    as: 'sale'
});

SalePayment.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processor'
});

// SaleReturnItem relationships
Sale.hasMany(SaleReturnItem, {
    foreignKey: 'saleId',
    as: 'returnItems'
});

SaleReturnItem.belongsTo(Sale, {
    foreignKey: 'saleId',
    as: 'sale'
});

SaleReturnItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

Product.belongsTo(Brand, {
    foreignKey: 'brandId',
    as: 'brand'
});



// Refund belongs to Customer
CustomerRefund.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Refund processed by User
CustomerRefund.belongsTo(User, { foreignKey: 'userId', as: 'processedBy' });

// Refund has many items
CustomerRefund.hasMany(CustomerRefundItem, { foreignKey: 'refundId', as: 'items' });

// Refund item belongs to Refund
CustomerRefundItem.belongsTo(CustomerRefund, { foreignKey: 'refundId', as: 'refund' });

// Refund item belongs to Product
CustomerRefundItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Refund linked to Payment
CustomerRefund.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

CustomerRefund.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// EmailLog relationships
EmailLog.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

EmailLog.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});


// 1️⃣ Repairs → Branch
Repairs.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

// 2️⃣ Branch → Repairs
Branch.hasMany(Repairs, {
    foreignKey: 'branchId',
    as: 'repairs'
});

// 3️⃣ Repairs → User (createdBy)
Repairs.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'createdUser'
});

// 4️⃣ User → Repairs
User.hasMany(Repairs, {
    foreignKey: 'createdBy',
    as: 'createdRepairs'
});

Customer.hasMany(CustomerDiscount, {
    foreignKey: 'customerId',
    as: 'discounts'
});

// One discount → one customer
CustomerDiscount.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

// Customer & NotificationLog relationships
Customer.hasMany(NotificationLog, {
    foreignKey: 'customerId',
    as: 'notifications'
});

NotificationLog.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

Product.hasMany(CustomerDiscount, {
    foreignKey: 'productId',
    as: 'customerDiscounts'
});
// One discount → one product
CustomerDiscount.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// call associations
Product.hasMany(Promotion, {
    foreignKey: 'productId',
    as: 'promotions'
});

Promotion.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// Reward product association for Buy-X-Get-Y promotions
Promotion.belongsTo(Product, {
    foreignKey: 'rewardProductId',
    as: 'rewardProduct'
});

// Counter & Session associations
Counter.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

Branch.hasMany(Counter, {
    foreignKey: 'branchId',
    as: 'counters'
});

CounterSession.belongsTo(Counter, {
    foreignKey: 'counterId',
    as: 'counter'
});

Counter.hasMany(CounterSession, {
    foreignKey: 'counterId',
    as: 'sessions'
});

CounterSession.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

CounterSession.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

Sale.belongsTo(CounterSession, {
    foreignKey: 'counterSessionId',
    as: 'counterSession'
});

CounterSession.hasMany(Sale, {
    foreignKey: 'counterSessionId',
    as: 'sales'
});

//customer id forign to sms
Sms.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

Customer.hasMany(Sms, {
    foreignKey: 'customerId',
    as: 'smsMessages'
});

// Expense relationships
Expense.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

Expense.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updater'
});

Expense.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

// Sale & Promotion relationships
Sale.belongsTo(Promotion, {
    foreignKey: 'promotionId',
    as: 'promotion'
});

Promotion.hasMany(Sale, {
    foreignKey: 'promotionId',
    as: 'sales'
});

SaleItem.belongsTo(Promotion, {
    foreignKey: 'promotionId',
    as: 'promotion'
});

Promotion.hasMany(SaleItem, {
    foreignKey: 'promotionId',
    as: 'itemUsages'
});

// New Many-to-Many via SalePromotion
// SalePromotion already imported at top

Sale.belongsToMany(Promotion, {
    through: SalePromotion,
    foreignKey: 'saleId',
    otherKey: 'promotionId',
    as: 'appliedPromotions'
});

Promotion.belongsToMany(Sale, {
    through: SalePromotion,
    foreignKey: 'promotionId',
    otherKey: 'saleId',
    as: 'salesWhereApplied'
});

Sale.hasMany(SalePromotion, {
    foreignKey: 'saleId',
    as: 'salePromotions'
});

SalePromotion.belongsTo(Sale, {
    foreignKey: 'saleId',
    as: 'sale'
});

SalePromotion.belongsTo(Promotion, {
    foreignKey: 'promotionId',
    as: 'promotion'
});

// PromotionItem relationships
Promotion.hasMany(PromotionItem, {
    foreignKey: 'promotionId',
    as: 'items'
});

PromotionItem.belongsTo(Promotion, {
    foreignKey: 'promotionId',
    as: 'promotion'
});

Product.hasMany(PromotionItem, {
    foreignKey: 'productId',
    as: 'promotionItems'
});

PromotionItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// SupplierPayment relationships
SupplierPayment.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

Suppliers.hasMany(SupplierPayment, {
    foreignKey: 'supplierId',
    as: 'payments'
});

SupplierPayment.belongsTo(GRN, {
    foreignKey: 'grnId',
    as: 'grn'
});

GRN.hasMany(SupplierPayment, {
    foreignKey: 'grnId',
    as: 'supplierPayments'
});

SupplierPayment.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

SupplierPayment.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

// SupplierCredit relationships
SupplierCredit.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

Suppliers.hasMany(SupplierCredit, {
    foreignKey: 'supplierId',
    as: 'creditTransactions'
});

SupplierCredit.belongsTo(User, {
    foreignKey: 'performedBy',
    as: 'user'
});

SupplierCredit.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

// HeldBill relationships
HeldBill.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

HeldBill.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

HeldBill.belongsTo(User, {
    foreignKey: 'loadedBy',
    as: 'loader'
});

HeldBill.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

HeldBill.belongsTo(Sale, {
    foreignKey: 'completedSaleId',
    as: 'completedSale'
});

HeldBill.belongsTo(CounterSession, {
    foreignKey: 'counterSessionId',
    as: 'counterSession'
});

// SupplierReturn relationships
SupplierReturn.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

SupplierReturn.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

SupplierReturn.belongsTo(GRN, {
    foreignKey: 'grnId',
    as: 'grn'
});

SupplierReturn.belongsTo(User, {
    foreignKey: 'performedByUserId',
    as: 'performedBy'
});

SupplierReturn.belongsTo(User, {
    foreignKey: 'approvedBy',
    as: 'approver'
});

SupplierReturn.hasMany(SupplierReturnPayment, {
    foreignKey: 'supplierReturnId',
    as: 'payments'
});

// SupplierReturnPayment relationships
SupplierReturnPayment.belongsTo(SupplierReturn, {
    foreignKey: 'supplierReturnId',
    as: 'supplierReturn'
});

SupplierReturnPayment.belongsTo(Suppliers, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

SupplierReturnPayment.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processor'
});

// CustomerRefund enhanced relationships
CustomerRefund.belongsTo(Sale, {
    foreignKey: 'saleId',
    as: 'sale'
});

CustomerRefund.belongsTo(User, {
    foreignKey: 'approvedBy',
    as: 'approver'
});

CustomerRefund.hasMany(CustomerReturnPayment, {
    foreignKey: 'customerRefundId',
    as: 'payments'
});

// CustomerReturnPayment relationships
CustomerReturnPayment.belongsTo(CustomerRefund, {
    foreignKey: 'customerRefundId',
    as: 'customerRefund'
});

CustomerReturnPayment.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

CustomerReturnPayment.belongsTo(User, {
    foreignKey: 'processedBy',
    as: 'processor'
});

// CustomerRefundItem enhanced relationships
CustomerRefundItem.belongsTo(SaleItem, {
    foreignKey: 'saleItemId',
    as: 'saleItem'
});

const db = {
    sequelize,
    Sequelize,
    Product,
    User,
    Role,
    AuditLog,
    Permission,
    UserPermission,
    Suppliers,
    Companies,
    Category,
    PurchaseOrder,
    PurchaseOrderItem,
    GRN,
    GRNItem,
    Inventory,
    InventoryLedger,
    Location,
    ProductAuditLog,
    Customer,
    CustomerLoyalty,
    CustomerCredit,
    CustomerPurchaseHistory,
    Payment,
    Sale,
    SaleItem,
    SalePayment,
    SupplierReturn,
    Brand,
    CustomerRefund,
    CustomerRefundItem,
    SystemSettings,
    Branch,
    UserBranch,
    EmailLog,
    Repairs,
    CustomerDiscount,
    NotificationLog,
    Promotion,
    Sms,
    Expense,
    Counter,
    CounterSession,
    SalePromotion,
    SaleReturnItem,
    PromotionItem,
    SupplierPayment,
    SupplierCredit,
    HeldBill,
    SupplierReturnPayment,
    CustomerReturnPayment
};

module.exports = db;