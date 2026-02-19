const { Inventory, InventoryLedger, Product } = require('../models');

/**
 * This script syncs existing Inventory records to InventoryLedger
 * Run this once if you have existing inventory that needs to be available for sales
 */
const syncInventoryToLedger = async () => {
    try {
        console.log('Starting inventory sync to ledger...');

        // Get all inventory records grouped by product
        const inventoryRecords = await Inventory.findAll({
            order: [['productId', 'ASC'], ['createdAt', 'ASC']]
        });

        if (inventoryRecords.length === 0) {
            console.log('No inventory records found to sync.');
            return;
        }

        console.log(`Found ${inventoryRecords.length} inventory records to sync.`);

        // Group by product
        const productMap = {};
        for (const record of inventoryRecords) {
            if (!productMap[record.productId]) {
                productMap[record.productId] = [];
            }
            productMap[record.productId].push(record);
        }

        let syncedCount = 0;
        let skippedCount = 0;

        for (const [productId, records] of Object.entries(productMap)) {
            const product = await Product.findByPk(productId);
            if (!product) {
                console.log(`Product ${productId} not found, skipping...`);
                skippedCount += records.length;
                continue;
            }

            // Check if ledger entries already exist for this product
            const existingLedger = await InventoryLedger.findOne({
                where: { productId }
            });

            if (existingLedger) {
                console.log(`Product ${product.name} (${product.productCode}) already has ledger entries, skipping...`);
                skippedCount += records.length;
                continue;
            }

            let runningBalance = 0;

            // Create ledger entries for each inventory record
            for (const record of records) {
                const quantityChange = (record.quantityIn || 0) - (record.quantityOut || 0);
                runningBalance += quantityChange;

                await InventoryLedger.create({
                    companyId: product.companyId,
                    productId: record.productId,
                    supplierId: record.supplierId,
                    supplierName: record.supplierName,
                    supplierPhone: record.supplierPhone,
                    locationId: record.locationId,
                    grnId: record.grnId,
                    transactionType: record.quantityIn > 0 ? 'in' : 'out',
                    quantityIn: record.quantityIn || 0,
                    quantityOut: record.quantityOut || 0,
                    balanceQuantity: runningBalance,
                    unitCost: record.unitCost || 0,
                    totalValue: (record.unitCost || 0) * (record.quantityIn || record.quantityOut || 0),
                    batchNumber: record.batchNumber,
                    expiryDate: record.expiryDate,
                    referenceType: record.referenceType || 'adjustment',
                    referenceId: record.referenceId,
                    notes: `Synced from Inventory table - ${record.remarks || ''}`,
                    performedBy: 1,
                    createdAt: record.createdAt,
                    updatedAt: record.updatedAt
                });

                syncedCount++;
            }

            console.log(`✓ Synced ${records.length} records for product: ${product.name} (Balance: ${runningBalance})`);
        }

        console.log('\n✅ Inventory sync completed!');
        console.log(`- Synced: ${syncedCount} records`);
        console.log(`- Skipped: ${skippedCount} records`);

    } catch (error) {
        console.error('❌ Error syncing inventory:', error);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    syncInventoryToLedger()
        .then(() => {
            console.log('Sync finished');
            process.exit(0);
        })
        .catch(err => {
            console.error('Sync failed:', err);
            process.exit(1);
        });
}

module.exports = syncInventoryToLedger;
