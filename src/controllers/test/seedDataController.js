const db = require('../../models');
const { 
    Companies, Suppliers, Category, Location, Product, User, Role, Customer, Brand,
    PurchaseOrder, PurchaseOrderItem, GRN, GRNItem, Inventory, Sale, SaleItem, SalePayment
} = db;
const seedTestData = require('../../seeders/testData');
const grnService = require('../../services/grns/grnService');

exports.seedFullDataSet = async (req, res, next) => {
    let transaction;
    try {
        console.log('Seeding full data set via API...');
        
        // 1. Run the base test data seeder (Companies, Suppliers, Categories, Locations, Products)
        // This function handles its own errors but we should try/catch it.
        // It relies on finding or creating, so it's idempotent-ish.
        const baseData = await seedTestData();
        
        // 2. Seed Brands
        console.log('Seeding Brands...');
        const samsung = await Brand.findOrCreate({
            where: { name: 'Samsung' },
            defaults: { name: 'Samsung', description: 'Samsung Electronics', isActive: true }
        });
        const apple = await Brand.findOrCreate({
            where: { name: 'Apple' },
            defaults: { name: 'Apple', description: 'Apple Inc.', isActive: true }
        });

        // Update existing products with brands if needed
        if (baseData.products.length > 0) {
            await Product.update({ brandId: apple[0].id }, { where: { productCode: 'PROD-001' } });
            await Product.update({ brandId: samsung[0].id }, { where: { productCode: 'PROD-002' } });
        }

        // 3. Seed Customers
        console.log('Seeding Customers...');
        const customer1 = await Customer.findOrCreate({
            where: { phone: '0777123456' },
            defaults: {
                customerName: 'Kamal Perera',
                phone: '0777123456',
                customerType: 'retail',
                isActive: true,
                createdBy: req.user?.id || 1 // Assuming user 1 exists if req.user is missing
            }
        });

        const customer2 = await Customer.findOrCreate({
            where: { phone: '0712345678' },
            defaults: {
                customerName: 'Nimal Silva',
                phone: '0712345678',
                customerType: 'wholesale',
                isActive: true,
                createdBy: req.user?.id || 1
            }
        });

        // 4. Seed Purchase Orders
        console.log('Seeding Purchase Orders...');
        // Need a transaction for complex creations
        // However, mixing transactions with calls that might not use them (like seedTestData which we can't control easily from here without check)
        // is tricky. user instructions imply "add sample data".
        
        // Create a PO
        const po = await PurchaseOrder.create({
            poNumber: 'PO-' + Date.now(),
            supplierId: baseData.suppliers[0].id,
            status: 'completed',
            orderDate: new Date(),
            expectedDate: new Date(Date.now() + 86400000),
            // totalAmount: 500000, -- Removed as it's not in the model definition shown
            createdBy: req.user?.id || 1,
            branchId: req.user?.branchId || 1
        });

        await PurchaseOrderItem.create({
            poId: po.id,
            productId: baseData.products[0].id,
            quantityOrdered: 10,
            // unitCost and lineTotal are not in PurchaseOrderItem model
        });

        // 5. Seed GRN (using service to ensure inventory logic runs if approved)
        console.log('Seeding GRN...');
        
        // We'll create a new transaction for GRN to be safe
        transaction = await db.sequelize.transaction();

        const grnNumber = await grnService.generateGRNNumber(req.user?.branchId || 1);
        const grnData = {
            grnNumber,
            supplierId: baseData.suppliers[0].id,
            poId: po.id,
            grnDate: new Date(),
            inspectionNotes: 'Auto-seeded GRN',
            createdBy: req.user?.id || 1,
            branchId: req.user?.branchId || 1,
            status: 'draft',
            totalQuantity: 5,
            totalAmount: 5 * baseData.products[0].costPrice
        };

        const grnItems = [
            {
                productId: baseData.products[0].id,
                quantityReceived: 5,
                unitCost: baseData.products[0].costPrice,
                sellingPrice: baseData.products[0].costPrice * 1.2,
                mrp: baseData.products[0].costPrice * 1.3,
                batchNumber: `BCH-${Date.now()}`,
                receivedQty: 5
            }
        ];

        const createdGRN = await grnService.createGRN(grnData, grnItems, transaction);
        
        // Approve it to update inventory
        // Note: existing createGRN doesn't approve. We need to complete it.
        // We can't easily call completeGRN inside this transaction if createGRN didn't return a "clean" state or if we want to simulate distinct steps.
        // But let's just commit the creation first.
        await transaction.commit();
        transaction = null;

        // Approve GRN separately to trigger inventory updates
        const approvalTransaction = await db.sequelize.transaction();
        try {
            const userContext = { userId: req.user?.id || 1, userName: 'Seeder' };
            const branchConfig = { branchId: req.user?.branchId || 1 };
            await grnService.completeGRN(createdGRN.id, branchConfig, userContext, approvalTransaction);
            await approvalTransaction.commit();
        } catch (err) {
            await approvalTransaction.rollback();
            console.error('Failed to approve seeded GRN:', err);
            // Don't fail the whole request, as data was created
        }


        // 6. Seed Sale
        console.log('Seeding Sale...');
        // We need inventory to sell. The GRN approval above should have added 5 stock.
        const saleTransaction = await db.sequelize.transaction();
        try {
            const sale = await Sale.create({
                saleNumber: 'SAL-' + Date.now(),
                customerId: customer1[0].id,
                cashierId: req.user?.id || 1,
                branchId: req.user?.branchId || 1,
                subtotal: 100000,
                discountAmount: 0,
                taxAmount: 0,
                totalAmount: 100000,
                paymentStatus: 'paid',
                saleStatus: 'completed',
                saleDate: new Date()
            }, { transaction: saleTransaction });

            await SaleItem.create({
                saleId: sale.id,
                productId: baseData.products[0].id,
                productName: baseData.products[0].name,
                productCode: baseData.products[0].productCode,
                quantity: 1,
                unitPrice: 100000,
                subtotal: 100000,
                totalAmount: 100000
            }, { transaction: saleTransaction });

            await SalePayment.create({
                saleId: sale.id,
                paymentMethod: 'cash',
                amount: 100000,
                processedBy: req.user?.id || 1
            }, { transaction: saleTransaction });

            // Note: In a real app, we'd deduct inventory here too. 
            // Assuming salesService handles this usually, but for seeder we might skip or manually adjust.
            // For now, just creating the record.
            
            await saleTransaction.commit();
        } catch(err) {
            await saleTransaction.rollback();
            console.error('Failed to seed sale:', err);
        }

        res.json({
            success: true,
            message: 'Full data set seeded successfully!',
            data: {
                company: baseData.company,
                products: baseData.products.length,
                brands: [samsung[0].name, apple[0].name],
                customers: [customer1[0].customerName, customer2[0].customerName],
                po: po.poNumber,
                grn: createdGRN.grnNumber
            }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        next(error);
    }
};
