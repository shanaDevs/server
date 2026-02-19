const mysql = require('mysql2/promise');
require('dotenv').config();

async function addProductCodeUniqueConstraint() {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database');

        // Step 1: Check for duplicate product codes
        console.log('\n📊 Checking for duplicate product codes...');
        const [duplicates] = await connection.execute(`
            SELECT product_code, COUNT(*) as count 
            FROM products 
            WHERE product_code IS NOT NULL AND product_code != ''
            GROUP BY product_code 
            HAVING count > 1
        `);

        if (duplicates.length > 0) {
            console.log('⚠️  Found duplicate product codes:');
            console.table(duplicates);

            console.log('\n🔧 Fixing duplicates by appending product ID...');

            // Fix duplicates by appending the product ID
            for (const dup of duplicates) {
                const [products] = await connection.execute(
                    'SELECT id, product_code FROM products WHERE product_code = ? ORDER BY id',
                    [dup.product_code]
                );

                // Keep the first one, update the rest
                for (let i = 1; i < products.length; i++) {
                    const newCode = `${products[i].product_code}_${products[i].id}`;
                    await connection.execute(
                        'UPDATE products SET product_code = ? WHERE id = ?',
                        [newCode, products[i].id]
                    );
                    console.log(`   Updated product ID ${products[i].id}: ${products[i].product_code} → ${newCode}`);
                }
            }
            console.log('✅ Duplicates resolved');
        } else {
            console.log('✅ No duplicate product codes found');
        }

        // Step 2: Check if unique constraint already exists
        console.log('\n🔍 Checking if unique constraint already exists...');
        const [indexes] = await connection.execute(`
            SHOW INDEX FROM products WHERE Key_name = 'idx_products_product_code_unique'
        `);

        if (indexes.length > 0) {
            console.log('ℹ️  Unique constraint already exists. Skipping...');
        } else {
            // Step 3: Add unique constraint
            console.log('\n🔨 Adding unique constraint to product_code column...');
            await connection.execute(`
                ALTER TABLE products 
                ADD UNIQUE INDEX idx_products_product_code_unique (product_code)
            `);
            console.log('✅ Unique constraint added successfully');
        }

        // Step 4: Verify the constraint
        console.log('\n✅ Verifying constraint...');
        const [verification] = await connection.execute(`
            SHOW INDEX FROM products WHERE Key_name = 'idx_products_product_code_unique'
        `);

        if (verification.length > 0) {
            console.log('✅ Constraint verified successfully');
            console.table(verification);
        }

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the migration
addProductCodeUniqueConstraint();
