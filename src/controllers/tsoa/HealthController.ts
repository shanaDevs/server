import { Controller, Get, Route, Tags, SuccessResponse } from 'tsoa';

/**
 * Health check response
 */
export interface HealthResponse {
    status: string;
    timestamp: string;
    uptime: number;
    database?: string;
    version?: string;
}

/**
 * Health Controller
 * Provides system health and status information
 */
@Route('tsoa/health')
@Tags('Health')
export class HealthController extends Controller {
    /**
     * Get system health status
     * @summary Check if the API is running and healthy
     * @returns Health status information
     */
    @Get('/')
    @SuccessResponse('200', 'System is healthy')
    public async getHealth(): Promise<HealthResponse> {
        const { sequelize } = require('../../config/database');

        let databaseStatus = 'disconnected';

        try {
            await sequelize.authenticate();
            databaseStatus = 'connected';
        } catch (error) {
            console.error('Database connection check failed:', error);
        }

        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: databaseStatus,
            version: '2.0.0'
        };
    }

    /**
     * Get detailed system information
     * @summary Get detailed system metrics
     * @returns Detailed system information
     */
    @Get('/detailed')
    @SuccessResponse('200', 'Detailed health information')
    public async getDetailedHealth(): Promise<any> {
        const { sequelize } = require('../../config/database');
        const os = require('os');

        let databaseStatus = 'disconnected';

        try {
            await sequelize.authenticate();
            databaseStatus = 'connected';
        } catch (error) {
            console.error('Database connection check failed:', error);
        }

        return {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: databaseStatus,
            version: '2.0.0',
            system: {
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                nodeVersion: process.version
            },
            environment: process.env.NODE_ENV || 'development'
        };
    }
}
