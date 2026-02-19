const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const path = require('path');


const swaggerSpec = require('./config/swagger');
const { auditLogger } = require('./middlewares/auditLog');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Increased limit for base64 images

// Serve static files from public folder (for PDFs, images, etc.)
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Audit logging middleware (must be before routes)
app.use('/api', auditLogger);

// Swagger Documentation (Original swagger-jsdoc based)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'POS System API Documentation'
}));

// Use the same merged spec for TSOA documentation endpoint as well
app.use('/api-docs-tsoa', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'POS System API - TSOA Documentation'
}));


// Routes
/**
 * @swagger
 * /:
 *   get:
 *     summary: API root endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.get('/', (req, res) => {
    res.json({ message: 'POS System API is running' });
});

// Health check endpoint
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API health status
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api', require('./routes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});


module.exports = app;

