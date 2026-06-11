const request = require('supertest');

jest.mock('../../utils/geoUtils', () => {
  const actual = jest.requireActual('../../utils/geoUtils');
  return {
    ...actual,
    geocodeAddress: jest.fn(),
    reverseGeocode: jest.fn()
  };
});

jest.mock('../../db/queries/geocode', () => ({
  getCachedGeocode: jest.fn(),
  setCachedGeocode: jest.fn(),
  pruneExpiredGeocode: jest.fn()
}));

const app = require('../../server');
const geoUtils = require('../../utils/geoUtils');
const geocodeQueries = require('../../db/queries/geocode');

describe('GET /api/utils/distance', () => {
  const BASE = '/api/utils/distance';

  test('returns km and miles between two valid coordinates', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat1: 43.6532, lon1: -79.3832, lat2: 45.4215, lon2: -75.6972 });
    expect(res.status).toBe(200);
    expect(res.body.distance_km).toBeGreaterThan(300);
    expect(res.body.distance_km).toBeLessThan(400);
    expect(res.body.distance_miles).toBeGreaterThan(180);
    expect(res.body.from).toEqual({ lat: 43.6532, lon: -79.3832 });
    expect(res.body.to).toEqual({ lat: 45.4215, lon: -75.6972 });
  });

  test('returns 0 for identical coordinates', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat1: 43.6532, lon1: -79.3832, lat2: 43.6532, lon2: -79.3832 });
    expect(res.status).toBe(200);
    expect(res.body.distance_km).toBe(0);
    expect(res.body.distance_miles).toBe(0);
  });

  test('returns 400 when params are missing', async () => {
    const res = await request(app).get(BASE).query({ lat1: 43.6532 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 400 when lat is NaN', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat1: 'abc', lon1: -79.3832, lat2: 45.4215, lon2: -75.6972 });
    expect(res.status).toBe(400);
  });

  test('returns 400 with specific message when lat is out of bounds', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat1: 999, lon1: -79.3832, lat2: 45.4215, lon2: -75.6972 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lat must be between -90 and 90');
  });

  test('returns 400 with specific message when lon is out of bounds', async () => {
    const res = await request(app)
      .get(BASE)
      .query({ lat1: 43.6532, lon1: 999, lat2: 45.4215, lon2: -75.6972 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lon must be between -180 and 180');
  });
});

describe('GET /api/utils/geocode', () => {
  const BASE = '/api/utils/geocode';

  afterEach(() => jest.clearAllMocks());

  test('returns 400 when address param is missing', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Address parameter is required');
  });

  test('returns 404 when geocode resolves null', async () => {
    geoUtils.geocodeAddress.mockResolvedValueOnce(null);
    const res = await request(app).get(BASE).query({ address: 'Unknown Place XYZ' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Address not found or not in Canada');
  });

  test('returns coordinates and display_name on success', async () => {
    geoUtils.geocodeAddress.mockResolvedValueOnce({
      latitude: 43.6532,
      longitude: -79.3832,
      display_name: 'Toronto, Ontario, Canada',
      address: { city: 'Toronto', country: 'Canada' }
    });
    const res = await request(app).get(BASE).query({ address: 'Toronto, ON' });
    expect(res.status).toBe(200);
    expect(res.body.latitude).toBe(43.6532);
    expect(res.body.longitude).toBe(-79.3832);
    expect(res.body.display_name).toBe('Toronto, Ontario, Canada');
  });

  test('L2 hit: getCachedGeocode returns row — Nominatim is never called', async () => {
    geocodeQueries.getCachedGeocode.mockResolvedValueOnce({
      lat: 45.4215,
      lon: -75.6972,
      display_name: 'Ottawa, Ontario, Canada',
      address_json: { city: 'Ottawa', country: 'Canada' }
    });

    // Unique address string — guaranteed L1 miss on first call
    const res = await request(app).get(BASE).query({ address: 'geocode-l2-hit-unique-test' });

    expect(res.status).toBe(200);
    expect(res.body.latitude).toBe(45.4215);
    expect(res.body.longitude).toBe(-75.6972);
    expect(res.body.display_name).toBe('Ottawa, Ontario, Canada');
    expect(geoUtils.geocodeAddress).not.toHaveBeenCalled();
  });
});

describe('GET /api/utils/reverse-geocode', () => {
  const BASE = '/api/utils/reverse-geocode';

  afterEach(() => jest.clearAllMocks());

  test('returns 400 when lat is missing', async () => {
    const res = await request(app).get(BASE).query({ lon: -79.3832 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when lon is missing', async () => {
    const res = await request(app).get(BASE).query({ lat: 43.6532 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when lat is out of bounds', async () => {
    const res = await request(app).get(BASE).query({ lat: 200, lon: -79.3832 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lat must be between -90 and 90');
  });

  test('returns 400 when lon is out of bounds', async () => {
    const res = await request(app).get(BASE).query({ lat: 43.6532, lon: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lon must be between -180 and 180');
  });

  test('returns 404 when reverse geocode resolves null', async () => {
    geoUtils.reverseGeocode.mockResolvedValueOnce(null);
    const res = await request(app).get(BASE).query({ lat: 43.6532, lon: -79.3832 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Location not found');
  });

  test('returns address with echoed coordinates on success', async () => {
    geoUtils.reverseGeocode.mockResolvedValueOnce({
      display_name: 'City Hall, Toronto, Ontario, Canada',
      address: { city: 'Toronto' }
    });
    const res = await request(app).get(BASE).query({ lat: 43.6532, lon: -79.3832 });
    expect(res.status).toBe(200);
    expect(res.body.latitude).toBe(43.6532);
    expect(res.body.longitude).toBe(-79.3832);
    expect(res.body.display_name).toBe('City Hall, Toronto, Ontario, Canada');
  });
});
