const request = require('supertest');
const app = require('../../src/app');

describe('Health Check API', () => {
    it('should return 200 on health check', async () => {
        const res = await request(app)
            .get('/api/health')
            .expect(200);
        
        expect(res.body).toHaveProperty('status', 'OK');
        expect(res.body).toHaveProperty('timestamp');
    });

    it('should return API running message on root', async () => {
        const res = await request(app)
            .get('/')
            .expect(200);
        
        expect(res.body).toHaveProperty('message', 'POS System API is running');
    });
});
