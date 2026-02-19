// Promotion Module Test Script
// Run this after starting the server to verify all endpoints work

const API_BASE = 'http://localhost:3000/api';
let authToken = '';
let createdPromotionId = null;

// Helper function to make requests
async function request(method, endpoint, body = null, useAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (useAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { status: 500, error: error.message };
    }
}

// Test Suite
async function runTests() {
    console.log('🚀 Starting Promotion Module Tests...\n');
    
    // Test 1: Login (adjust credentials as needed)
    console.log('1️⃣ Testing Authentication...');
    const loginResult = await request('POST', '/users/login', {
        email: 'admin@example.com',
        password: 'password123'
    }, false);
    
    if (loginResult.status === 200 && loginResult.data.token) {
        authToken = loginResult.data.token;
        console.log('✅ Login successful\n');
    } else {
        console.log('❌ Login failed:', loginResult.data);
        console.log('⚠️  Please update credentials in the test script\n');
        return;
    }
    
    // Test 2: Create Promotion
    console.log('2️⃣ Testing Create Promotion...');
    const createResult = await request('POST', '/promotions', {
        productId: 1, // Adjust to existing product ID
        title: 'Test Promotion',
        description: 'Test promotion created by automated test',
        discountPercentage: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        isActive: true
    });
    
    if (createResult.status === 201) {
        createdPromotionId = createResult.data.data.id;
        console.log('✅ Create successful - ID:', createdPromotionId);
        console.log('   Data:', JSON.stringify(createResult.data.data, null, 2), '\n');
    } else {
        console.log('❌ Create failed:', createResult.data, '\n');
    }
    
    // Test 3: Get All Promotions
    console.log('3️⃣ Testing Get All Promotions...');
    const getAllResult = await request('GET', '/promotions?page=1&limit=10');
    
    if (getAllResult.status === 200) {
        console.log('✅ Get All successful');
        console.log(`   Found ${getAllResult.data.data.length} promotions`);
        console.log(`   Total: ${getAllResult.data.pagination.total}\n`);
    } else {
        console.log('❌ Get All failed:', getAllResult.data, '\n');
    }
    
    // Test 4: Get Promotion by ID
    if (createdPromotionId) {
        console.log('4️⃣ Testing Get Promotion by ID...');
        const getByIdResult = await request('GET', `/promotions/${createdPromotionId}`);
        
        if (getByIdResult.status === 200) {
            console.log('✅ Get by ID successful');
            console.log('   Title:', getByIdResult.data.data.title, '\n');
        } else {
            console.log('❌ Get by ID failed:', getByIdResult.data, '\n');
        }
    }
    
    // Test 5: Update Promotion
    if (createdPromotionId) {
        console.log('5️⃣ Testing Update Promotion...');
        const updateResult = await request('PUT', `/promotions/${createdPromotionId}`, {
            title: 'Updated Test Promotion',
            discountPercentage: 20
        });
        
        if (updateResult.status === 200) {
            console.log('✅ Update successful');
            console.log('   New title:', updateResult.data.data.title);
            console.log('   New discount:', updateResult.data.data.discountPercentage + '%\n');
        } else {
            console.log('❌ Update failed:', updateResult.data, '\n');
        }
    }
    
    // Test 6: Calculate Discounted Price
    console.log('6️⃣ Testing Calculate Discounted Price...');
    const calculateResult = await request('GET', '/promotions/product/1/calculate?originalPrice=100');
    
    if (calculateResult.status === 200) {
        console.log('✅ Calculate successful');
        console.log('   Original:', calculateResult.data.data.originalPrice);
        console.log('   Discounted:', calculateResult.data.data.discountedPrice);
        console.log('   Discount:', calculateResult.data.data.discount, '\n');
    } else {
        console.log('❌ Calculate failed:', calculateResult.data, '\n');
    }
    
    // Test 7: Get Active Promotions for Product
    console.log('7️⃣ Testing Get Active Promotions for Product...');
    const activeResult = await request('GET', '/promotions/product/1/active');
    
    if (activeResult.status === 200) {
        console.log('✅ Get Active successful');
        console.log(`   Found ${activeResult.data.data.length} active promotions\n`);
    } else {
        console.log('❌ Get Active failed:', activeResult.data, '\n');
    }
    
    // Test 8: Delete Promotion
    if (createdPromotionId) {
        console.log('8️⃣ Testing Delete Promotion...');
        const deleteResult = await request('DELETE', `/promotions/${createdPromotionId}`);
        
        if (deleteResult.status === 200) {
            console.log('✅ Delete successful');
            console.log('   Message:', deleteResult.data.message, '\n');
        } else {
            console.log('❌ Delete failed:', deleteResult.data, '\n');
        }
    }
    
    console.log('🎉 All tests completed!\n');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    runTests().catch(console.error);
} else {
    // Browser environment
    console.log('Run runTests() to start testing');
}

module.exports = { runTests };
