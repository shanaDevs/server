const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProductsIndexes() {
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

        // Check all indexes on products table
        console.log('📊 Current indexes on products table:');
        const [indexes] = await connection.execute('SHOW INDEX FROM products');
        console.table(indexes.map(idx => ({
            Key_name: idx.Key_name,
            Column_name: idx.Column_name,
            Non_unique: idx.Non_unique,
            Index_type: idx.Index_type
        })));

        console.log(`\nTotal number of indexes: ${new Set(indexes.map(i => i.Key_name)).size}`);

        // Check if product_code already has unique constraint
        const productCodeIndexes = indexes.filter(idx => idx.Column_name === 'product_code');
        if (productCodeIndexes.length > 0) {
            console.log('\n📌 Indexes on product_code column:');
            console.table(productCodeIndexes);
        } else {
            console.log('\n⚠️  No index found on product_code column');
        }

        // Check table structure
        console.log('\n📋 Table structure for product_code column:');
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM products WHERE Field = 'product_code'
        `);
        console.table(columns);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkProductsIndexes();
