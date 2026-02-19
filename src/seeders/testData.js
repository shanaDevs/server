const { 
    Companies, 
    Suppliers, 
    Category, 
    Location, 
    Product,
    User,
    Role 
} = require('../models');

const seedTestData = async () => {
    try {
        console.log('Starting test data seeding...');

        // 1. Create a test company
        const company = await Companies.findOrCreate({
            where: { name: 'Test Company Ltd' },
            defaults: {
                name: 'Test Company Ltd',
                address: '123 Main Street, Colombo',
                phoneNumber: '+94112345678',
                contactEmail: 'test@company.lk',
                isdisabled: false,
                idDeleted: false
            }
        });
        console.log('✓ Company created:', company[0].name);

        // 2. Create test suppliers
        const suppliers = await Promise.all([
            Suppliers.findOrCreate({
                where: { supplierCode: 'SUP-001' },
                defaults: {
                    name: 'ABC Electronics Suppliers',
                    supplierCode: 'SUP-001',
                    contactPerson: 'John Silva',
                    email: 'abc@suppliers.lk',
                    phone: '+94771234567',
                    address: '45 Galle Road, Colombo 03',
                    companyId: company[0].id,
                    isActive: true
                }
            }),
            Suppliers.findOrCreate({
                where: { supplierCode: 'SUP-002' },
                defaults: {
                    name: 'XYZ Mobile Distributors',
                    supplierCode: 'SUP-002',
                    contactPerson: 'Nimal Perera',
                    email: 'xyz@distributors.lk',
                    phone: '+94772345678',
                    address: '78 Kandy Road, Colombo 07',
                    companyId: company[0].id,
                    isActive: true
                }
            })
        ]);
        console.log('✓ Suppliers created:', suppliers.length);

        // 3. Create test category
        const category = await Category.findOrCreate({
            where: { name: 'Mobile Phones' },
            defaults: {
                name: 'Mobile Phones',
                description: 'Smartphones and mobile devices',
                isActive: true
            }
        });
        console.log('✓ Category created:', category[0].name);

        // 4. Create test location
        const location = await Location.findOrCreate({
            where: { code: 'LOC-001' },
            defaults: {
                name: 'Main Warehouse',
                code: 'LOC-001',
                type: 'warehouse',
                address: 'Primary storage location',
                companyId: company[0].id,
                isActive: true
            }
        });
        console.log('✓ Location created:', location[0].name);

        // 5. Create test products
        const products = await Promise.all([
            Product.findOrCreate({
                where: { productCode: 'PROD-001' },
                defaults: {
                    name: 'iPhone 15 Pro Max',
                    productCode: 'PROD-001',
                    description: 'Apple iPhone 15 Pro Max 256GB',
                    categoryId: category[0].id,
                    companyId: company[0].id,
                    supplierId: suppliers[0][0].id,
                    locationId: location[0].id,
                    unitOfMeasure: 'pcs',
                    costPrice: 450000,
                    minStockLevel: 5,
                    isActive: true
                }
            }),
            Product.findOrCreate({
                where: { productCode: 'PROD-002' },
                defaults: {
                    name: 'Samsung Galaxy S24 Ultra',
                    productCode: 'PROD-002',
                    description: 'Samsung Galaxy S24 Ultra 512GB',
                    categoryId: category[0].id,
                    companyId: company[0].id,
                    supplierId: suppliers[1][0].id,
                    locationId: location[0].id,
                    unitOfMeasure: 'pcs',
                    costPrice: 420000,
                    minStockLevel: 5,
                    isActive: true
                }
            }),
            Product.findOrCreate({
                where: { productCode: 'PROD-003' },
                defaults: {
                    name: 'Google Pixel 8 Pro',
                    productCode: 'PROD-003',
                    description: 'Google Pixel 8 Pro 256GB',
                    categoryId: category[0].id,
                    companyId: company[0].id,
                    supplierId: suppliers[0][0].id,
                    locationId: location[0].id,
                    unitOfMeasure: 'pcs',
                    costPrice: 350000,
                    minStockLevel: 5,
                    isActive: true
                }
            })
        ]);
        console.log('✓ Products created:', products.length);

        console.log('\n✅ Test data seeding completed successfully!');
        console.log('\nCreated data IDs:');
        console.log('- Company ID:', company[0].id);
        console.log('- Supplier IDs:', suppliers.map(s => s[0].id));
        console.log('- Category ID:', category[0].id);
        console.log('- Location ID:', location[0].id);
        console.log('- Product IDs:', products.map(p => p[0].id));

        return {
            company: company[0],
            suppliers: suppliers.map(s => s[0]),
            category: category[0],
            location: location[0],
            products: products.map(p => p[0])
        };

    } catch (error) {
        console.error('❌ Error seeding test data:', error);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    seedTestData()
        .then(() => {
            console.log('Seeding finished');
            process.exit(0);
        })
        .catch(err => {
            console.error('Seeding failed:', err);
            process.exit(1);
        });
}

module.exports = seedTestData;
