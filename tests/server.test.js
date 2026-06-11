const request = require('supertest');
const app = require('../server');

describe('GET /', () => {
  test('returns API name and endpoint map', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Canadian Services API');
    expect(res.body.endpoints).toBeDefined();
  });
});

describe('GET /health', () => {
  test('returns ok status with uptime and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('GET /docs.json', () => {
  test('returns OpenAPI 3.0 spec with expected structure', async () => {
    const res = await request(app).get('/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('Canada Services API');
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.paths).toBeDefined();
  });
});

describe('404 handler', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/not-a-real-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Endpoint not found');
  });
});
