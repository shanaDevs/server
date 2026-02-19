const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupDuplicateIndexes() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database\n');

        // Get all indexes on products table
        const [indexes] = await connection.execute('SHOW INDEX FROM products');

        // Find all product_code indexes (excluding PRIMARY and the main unique constraint)
        const productCodeIndexes = indexes
            .filter(idx => idx.Column_name === 'product_code' && idx.Key_name !== 'PRIMARY')
            .map(idx => idx.Key_name);

        // Get unique index names
        const uniqueIndexNames = [...new Set(productCodeIndexes)];

        console.log(`📊 Found ${uniqueIndexNames.length} indexes on product_code column:`);
        console.log(uniqueIndexNames);

        if (uniqueIndexNames.length === 0) {
            console.log('\n✅ No indexes to clean up');
            return;
        }

        // Keep only one unique index (preferably named 'product_code' or similar)
        const indexToKeep = uniqueIndexNames.find(name =>
            name === 'product_code' ||
            name === 'idx_products_product_code_unique' ||
            name === 'products_product_code_unique'
        ) || uniqueIndexNames[0]; // If none of the preferred names exist, keep the first one

        console.log(`\n✅ Keeping index: ${indexToKeep}`);

        const indexesToDrop = uniqueIndexNames.filter(name => name !== indexToKeep);

        if (indexesToDrop.length === 0) {
            console.log('\n✅ No duplicate indexes to remove');
            return;
        }

        console.log(`\n🗑️  Dropping ${indexesToDrop.length} duplicate indexes...`);

        let droppedCount = 0;
        for (const indexName of indexesToDrop) {
            try {
                await connection.execute(`ALTER TABLE products DROP INDEX \`${indexName}\``);
                console.log(`   ✓ Dropped: ${indexName}`);
                droppedCount++;
            } catch (error) {
                console.log(`   ✗ Failed to drop ${indexName}: ${error.message}`);
            }
        }

        console.log(`\n✅ Successfully dropped ${droppedCount} duplicate indexes`);

        // Verify remaining indexes
        const [remainingIndexes] = await connection.execute(
            'SHOW INDEX FROM products WHERE Column_name = ?',
            ['product_code']
        );

        console.log('\n📊 Remaining indexes on product_code:');
        console.table(remainingIndexes.map(idx => ({
            Key_name: idx.Key_name,
            Non_unique: idx.Non_unique,
            Index_type: idx.Index_type
        })));

        // Check total index count
        const [allIndexes] = await connection.execute('SHOW INDEX FROM products');
        const totalIndexCount = new Set(allIndexes.map(i => i.Key_name)).size;
        console.log(`\n📈 Total indexes on products table: ${totalIndexCount}/64`);

        console.log('\n🎉 Cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

cleanupDuplicateIndexes();
