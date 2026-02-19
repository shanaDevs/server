/**
 * TSOA Integration Test Script
 * 
 * This script tests the TSOA integration by making requests to the TSOA endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testTSOAIntegration() {
    console.log('🧪 Testing TSOA Integration...\n');

    try {
        // Test 1: Health Check (TSOA)
        console.log('1️⃣ Testing TSOA Health Endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/api/tsoa/health`);
        console.log('✅ Health Check Response:', healthResponse.data);
        console.log('');

        // Test 2: Detailed Health Check (TSOA)
        console.log('2️⃣ Testing TSOA Detailed Health Endpoint...');
        const detailedHealthResponse = await axios.get(`${BASE_URL}/api/tsoa/health/detailed`);
        console.log('✅ Detailed Health Response:', detailedHealthResponse.data);
        console.log('');

        // Test 3: Check if TSOA Swagger is accessible
        console.log('3️⃣ Testing TSOA Swagger JSON...');
        const swaggerResponse = await axios.get(`${BASE_URL}/public/swagger.json`);
        console.log('✅ Swagger JSON loaded successfully');
        console.log(`   - OpenAPI Version: ${swaggerResponse.data.openapi}`);
        console.log(`   - API Title: ${swaggerResponse.data.info.title}`);
        console.log(`   - API Version: ${swaggerResponse.data.info.version}`);
        console.log(`   - Total Endpoints: ${Object.keys(swaggerResponse.data.paths).length}`);
        console.log('');

        // Test 4: List available TSOA endpoints
        console.log('4️⃣ Available TSOA Endpoints:');
        Object.keys(swaggerResponse.data.paths).forEach(path => {
            const methods = Object.keys(swaggerResponse.data.paths[path]);
            methods.forEach(method => {
                const endpoint = swaggerResponse.data.paths[path][method];
                console.log(`   ${method.toUpperCase().padEnd(7)} ${path.padEnd(30)} - ${endpoint.summary || 'No summary'}`);
            });
        });
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ TSOA Integration Test PASSED!');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('📚 Access Documentation:');
        console.log(`   - Original Swagger: ${BASE_URL}/api-docs`);
        console.log(`   - TSOA Swagger: ${BASE_URL}/api-docs-tsoa`);
        console.log('');
        console.log('🎉 TSOA is working correctly!');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run tests
testTSOAIntegration();
