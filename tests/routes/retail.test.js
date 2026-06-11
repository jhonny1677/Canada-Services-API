const request = require('supertest');

jest.mock('../../utils/overpassApi', () =>
  jest.fn().mockImplementation(() => ({
    buildRetailQuery: jest.fn(() => 'mock_query'),
    query: jest.fn(() => Promise.resolve({ elements: [] })),
    parseElements: jest.fn(() => [])
  }))
);

jest.mock('../../utils/geoUtils', () => ({
  ...jest.requireActual('../../utils/geoUtils'),
  geocodeAddress: jest.fn()
}));

jest.mock('../../db/queries/services', () => ({
  findNearby: jest.fn(),
  upsertServices: jest.fn(),
  getDistinctTypes: jest.fn()
}));

jest.mock('../../db/queries/geocode', () => ({
  getCachedGeocode: jest.fn(),
  setCachedGeocode: jest.fn()
}));

const OverpassAPI = require('../../utils/overpassApi');
const app = require('../../server');
const geoUtils = require('../../utils/geoUtils');
const servicesQueries = require('../../db/queries/services');

// server.js loads healthcare before retail, so retail's OverpassAPI is results[1]
const mockOverpass = OverpassAPI.mock.results[1].value;

afterEach(() => jest.clearAllMocks());

describe('GET /api/retail/categories', () => {
  test('returns category map with shop type arrays', async () => {
    const res = await request(app).get('/api/retail/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveProperty('grocery');
    expect(res.body.categories).toHaveProperty('electronics');
    expect(Array.isArray(res.body.categories.grocery)).toBe(true);
    expect(typeof res.body.description).toBe('string');
  });
});

describe('GET /api/retail/nearby', () => {
  const BASE = '/api/retail/nearby';

  test('returns 400 when no location provided', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 400 when lat is NaN', async () => {
    const res = await request(app).get(BASE).query({ lat: 'bad', lon: -79.3832 });
    expect(res.status).toBe(400);
  });

  test('returns 400 with specific message when lat is out of bounds', async () => {
    const res = await request(app).get(BASE).query({ lat: 200, lon: -79.3832 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lat must be between -90 and 90');
  });

  test('returns 400 with specific message when lon is out of bounds', async () => {
    const res = await request(app).get(BASE).query({ lat: 43.6532, lon: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lon must be between -180 and 180');
  });

  test('returns 200 with categorized stores for valid lat/lon', async () => {
    const res = await request(app).get(BASE).query({ lat: 43.6532, lon: -79.3832 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.query.location).toEqual({ lat: 43.6532, lon: -79.3832 });
    expect(res.body.categories).toBeDefined();
    expect(Array.isArray(res.body.all)).toBe(true);
  });

  test('echoes category filter in query object', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat: 43.6532, lon: -79.3832, category: 'grocery' });
    expect(res.status).toBe(200);
    expect(res.body.query.category).toBe('grocery');
    expect(Array.isArray(res.body.query.shop_types)).toBe(true);
    expect(res.body.query.shop_types.length).toBeGreaterThan(0);
  });

  test('echoes shop_type filter in query object', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat: 43.6532, lon: -79.3832, shop_type: 'supermarket,bakery' });
    expect(res.status).toBe(200);
    expect(res.body.query.shop_types).toEqual(['supermarket', 'bakery']);
  });

  test('returns 404 when address cannot be geocoded', async () => {
    geoUtils.geocodeAddress.mockResolvedValueOnce(null);
    const res = await request(app).get(BASE).query({ address: 'Unknown Place XYZ' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Address not found or not in Canada');
  });

  test('returns 200 when address is geocoded successfully', async () => {
    geoUtils.geocodeAddress.mockResolvedValueOnce({
      latitude: 43.6532,
      longitude: -79.3832
    });
    const res = await request(app).get(BASE).query({ address: 'Vancouver, BC' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/retail/nearby — L2 cache paths', () => {
  const BASE = '/api/retail/nearby';

  const L2_HIT_PARAMS  = { lat: 51.05, lon: -114.07 }; // Calgary
  const L2_MISS_PARAMS = { lat: 53.55, lon: -113.49 }; // Edmonton

  test('L2 hit: findNearby returns data — Overpass is never called', async () => {
    const dbStores = [
      { id: 'uuid-2', lat: 51.05, lon: -114.07, name: 'Calgary Market', amenity: 'supermarket', distance: 0.4, tags: {} }
    ];
    servicesQueries.findNearby.mockResolvedValueOnce(dbStores);

    const res = await request(app).get(BASE).query(L2_HIT_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.all[0].name).toBe('Calgary Market');
    expect(mockOverpass.query).not.toHaveBeenCalled();
  });

  test('L2 miss: findNearby returns [] — Overpass is called and upsertServices is called', async () => {
    servicesQueries.findNearby.mockResolvedValueOnce([]);

    const res = await request(app).get(BASE).query(L2_MISS_PARAMS);

    expect(res.status).toBe(200);
    expect(mockOverpass.query).toHaveBeenCalled();
    expect(servicesQueries.upsertServices).toHaveBeenCalledWith(
      expect.any(Array),
      'retail'
    );
  });
});
