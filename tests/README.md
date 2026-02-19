# Tests

## Directory Structure

- `unit/` - Unit tests for individual functions and modules
- `integration/` - Integration tests for API endpoints

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Writing Tests

### Unit Tests
Unit tests should test individual functions in isolation.

Example:
```javascript
const { someFunction } = require('../../src/utils/helpers');

describe('someFunction', () => {
    it('should return expected result', () => {
        expect(someFunction(input)).toBe(expectedOutput);
    });
});
```

### Integration Tests
Integration tests should test API endpoints.

Example:
```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/users', () => {
    it('should create a new user', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({ name: 'Test User' })
            .expect(201);
    });
});
```
