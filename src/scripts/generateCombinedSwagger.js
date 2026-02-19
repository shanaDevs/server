const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../config/swagger');

const outputPath = path.join(__dirname, '../../public/swagger.json');

try {
    // Ensure the public directory exists
    const publicDir = path.dirname(outputPath);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Write the merged spec to public/swagger.json
    fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
    
    console.log('✅ Combined Swagger JSON generated successfully at:', outputPath);
    console.log(`   - Total Paths: ${Object.keys(swaggerSpec.paths || {}).length}`);
    console.log(`   - Total Schemas: ${Object.keys((swaggerSpec.components && swaggerSpec.components.schemas) || {}).length}`);
} catch (error) {
    console.error('❌ Failed to generate combined Swagger JSON:', error);
    process.exit(1);
}
