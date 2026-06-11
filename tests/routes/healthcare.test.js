const request = require('supertest');

jest.mock('../../utils/overpassApi', () =>
  jest.fn().mockImplementation(() => ({
    buildHealthcareQuery: jest.fn(() => 'mock_query'),
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

// Captured once at module load; clearAllMocks() resets call tracking but not this ref
const mockOverpass = OverpassAPI.mock.results[0].value;

afterEach(() => jest.clearAllMocks());

describe('GET /api/healthcare/types', () => {
  test('returns map of amenity keys to human-readable labels', async () => {
    const res = await request(app).get('/api/healthcare/types');
    expect(res.status).toBe(200);
    expect(res.body.healthcare_types).toMatchObject({
      hospital: expect.any(String),
      clinic: expect.any(String),
      pharmacy: expect.any(String),
      dentist: expect.any(String)
    });
  });
});

describe('GET /api/healthcare/nearby', () => {
  const BASE = '/api/healthcare/nearby';

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

  test('returns 200 with categorized facilities for valid lat/lon', async () => {
    const res = await request(app).get(BASE).query({ lat: 43.6532, lon: -79.3832 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.query.location).toEqual({ lat: 43.6532, lon: -79.3832 });
    expect(res.body.query.radius).toBe(5);
    expect(res.body.categories).toHaveProperty('hospitals');
    expect(res.body.categories).toHaveProperty('pharmacies');
    expect(Array.isArray(res.body.all)).toBe(true);
  });

  test('radius and limit are capped at max values', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat: 43.6532, lon: -79.3832, radius: 9999, limit: 9999 });
    expect(res.status).toBe(200);
    expect(res.body.query.radius).toBe(50);
    expect(res.body.query.limit).toBe(200);
  });

  test('returns 404 when address cannot be geocoded', async () => {
    geoUtils.geocodeAddress.mockResolvedValueOnce(null);
    const res = await request(app).get(BASE).query({ address: 'Unknown Place XYZ' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Address not found or not in Canada');
  });

  test('returns 200 when address is geocoded and facilities are found', async () => {
    geoUtils.geocodeAddress.mockResolvedValueOnce({
      latitude: 43.6532,
      longitude: -79.3832
    });
    const res = await request(app).get(BASE).query({ address: 'Toronto, ON' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(Array.isArray(res.body.all)).toBe(true);
  });
});

describe('GET /api/healthcare/nearby — L2 cache paths', () => {
  const BASE = '/api/healthcare/nearby';

  // Use coordinates not used in any other test to guarantee an L1 cache miss
  const L2_HIT_PARAMS  = { lat: 45.42, lon: -75.70 }; // Ottawa
  const L2_MISS_PARAMS = { lat: 49.25, lon: -123.12 }; // Vancouver

  test('L2 hit: findNearby returns data — Overpass is never called', async () => {
    const dbFacilities = [
      { id: 'uuid-1', lat: 45.42, lon: -75.70, name: 'Ottawa General', amenity: 'hospital', distance: 0.3, tags: {} }
    ];
    servicesQueries.findNearby.mockResolvedValueOnce(dbFacilities);

    const res = await request(app).get(BASE).query(L2_HIT_PARAMS);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.all[0].name).toBe('Ottawa General');
    expect(mockOverpass.query).not.toHaveBeenCalled();
  });

  test('L2 miss: findNearby returns [] — Overpass is called and upsertServices is called', async () => {
    servicesQueries.findNearby.mockResolvedValueOnce([]);

    const res = await request(app).get(BASE).query(L2_MISS_PARAMS);

    expect(res.status).toBe(200);
    expect(mockOverpass.query).toHaveBeenCalled();
    expect(servicesQueries.upsertServices).toHaveBeenCalledWith(
      expect.any(Array),
      'healthcare'
    );
  });
});
