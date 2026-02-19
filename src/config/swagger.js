const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'POS System API',
            version: '2.0.0',
            description: 'A comprehensive RESTful API for Point of Sale (POS) System with advanced inventory, sales, and customer management built with Express, MySQL, and Sequelize',
            contact: {
                name: 'API Support',
                email: 'support@Dartcodes.com'
            },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Development server'
            },
            {
                url: 'https://primus-distributor-backend.dev.dartcodes.com',
                description: 'Production server'
            }
        ],
        tags: [
            {
                name: 'Health',
                description: 'System health check and status endpoints'
            },
            {
                name: 'Users',
                description: 'User management and authentication endpoints'
            },
            {
                name: 'Roles',
                description: 'Role-based access control management'
            },
            {
                name: 'Permissions',
                description: 'Permission management and assignment'
            },
            {
                name: 'Audit Logs',
                description: 'System audit logs and activity tracking'
            },
            {
                name: 'Companies',
                description: 'Multi-company management endpoints'
            },
            {
                name: 'Categories',
                description: 'Product category management'
            },
            {
                name: 'Brands',
                description: 'Product brand management'
            },
            {
                name: 'Models',
                description: 'Product model management'
            },
            {
                name: 'Products',
                description: 'Product catalog and inventory management'
            },
            {
                name: 'Product Audit Logs',
                description: 'Product audit trail and history tracking'
            },
            {
                name: 'Suppliers',
                description: 'Supplier and vendor management'
            },
            {
                name: 'Supplier Returns',
                description: 'Supplier return and replacement management'
            },
            {
                name: 'Purchase Orders',
                description: 'Purchase order management and supplier ordering'
            },
            {
                name: 'GRNs',
                description: 'Goods Received Note (GRN) management and inventory receiving'
            },
            {
                name: 'Inventory',
                description: 'Real-time inventory tracking and ledger management'
            },
            {
                name: 'Customers',
                description: 'Customer management with loyalty and credit tracking'
            },
            {
                name: 'Customer Refunds',
                description: 'Customer refund management endpoints'
            },
            {
                name: 'Payments',
                description: 'Payment management endpoints'
            },
            {
                name: 'Sales',
                description: 'Sales transactions and POS operations'
            },
            {
                name: 'Category Summaries',
                description: 'Category analytics and statistics'
            },
            {
                name: 'Company Summaries',
                description: 'Company analytics and statistics'
            },
            {
                name: 'Customer Summaries',
                description: 'Customer analytics and statistics'
            },
            {
                name: 'Customer Refund Summaries',
                description: 'Customer refund analytics and statistics'
            },
            {
                name: 'GRN Summaries',
                description: 'Goods Received Note analytics and statistics'
            },
            {
                name: 'Inventory Summaries',
                description: 'Inventory analytics and statistics'
            },
            {
                name: 'Purchase Order Summaries',
                description: 'Purchase order analytics and statistics'
            },
            {
                name: 'Sales Summaries',
                description: 'Sales analytics and statistics'
            },
            {
                name: 'Supplier Summaries',
                description: 'Supplier analytics and statistics'
            },
            {
                name: 'User Summaries',
                description: 'User activity analytics and statistics'
            },
            {
                name: 'Branches',
                description: 'Company branch management and access control'
            },
            {
                name: 'Dashboard Summaries',
                description: 'Dashboard quick summaries and KPIs for business insights'
            },
            {   
                name: 'customer-discounts', 
                description: 'Customer discount management endpoints' 
            },
            {
                name: 'Promotions',
                description: 'Product promotion and discount management'
            },
            {
                name: 'Expenses',
                description: 'Business expense management and tracking'
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: your-token-here'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Error message'
                        },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operation successful'
                        },
                        data: {
                            type: 'object'
                        }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object'
                            }
                        },
                        total: {
                            type: 'integer',
                            example: 100
                        },
                        page: {
                            type: 'integer',
                            example: 1
                        },
                        limit: {
                            type: 'integer',
                            example: 10
                        }
                    }
                },
                CategorySummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                            type: 'object',
                            properties: {
                                total: { type: 'integer', example: 100 },
                                active: { type: 'integer', example: 75 },
                                inactive: { type: 'integer', example: 25 }
                            }
                        }
                    }
                },
                CompanySummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                CustomerSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                CustomerRefundSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        month: { type: 'string', example: '2025-12' },
                        data: { type: 'object' }
                    }
                },
                GRNSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                InventorySummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                PurchaseOrderSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                SalesSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                SupplierSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                UserSummary: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                }
            },
            parameters: {
                PageParam: {
                    in: 'query',
                    name: 'page',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1
                    },
                    description: 'Page number for pagination'
                },
                LimitParam: {
                    in: 'query',
                    name: 'limit',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 10
                    },
                    description: 'Number of items per page'
                },
                SearchParam: {
                    in: 'query',
                    name: 'search',
                    schema: {
                        type: 'string'
                    },
                    description: 'Search query string'
                },
                IdParam: {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: {
                        type: 'integer'
                    },
                    description: 'Resource ID'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.js', './src/routes/**/*.js', './src/app.js', './server.js']
};

// Generate the base swagger spec from JSDoc
const swaggerSpec = swaggerJsdoc(options);

// Merge with TSOA generated spec if it exists
try {
    const tsoaSpecPath = path.join(__dirname, '../../public/swagger.json');
    if (fs.existsSync(tsoaSpecPath)) {
        const tsoaSpec = JSON.parse(fs.readFileSync(tsoaSpecPath, 'utf8'));
        
        // Merge paths
        if (tsoaSpec.paths) {
            Object.assign(swaggerSpec.paths, tsoaSpec.paths);
        }
        
        // Merge schemas
        if (tsoaSpec.components && tsoaSpec.components.schemas) {
            if (!swaggerSpec.components) swaggerSpec.components = {};
            if (!swaggerSpec.components.schemas) swaggerSpec.components.schemas = {};
            Object.assign(swaggerSpec.components.schemas, tsoaSpec.components.schemas);
        }

        // Merge tags
        if (tsoaSpec.tags) {
            if (!swaggerSpec.tags) swaggerSpec.tags = [];
            tsoaSpec.tags.forEach(tsoaTag => {
                if (!swaggerSpec.tags.find(tag => tag.name === tsoaTag.name)) {
                    swaggerSpec.tags.push(tsoaTag);
                }
            });
        }
    }
} catch (error) {
    console.warn('⚠️  Could not merge TSOA spec into main swagger:', error.message);
}

module.exports = swaggerSpec;

