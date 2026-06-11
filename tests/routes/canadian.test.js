const request = require('supertest');

// Variables prefixed with 'mock' are accessible inside jest.mock factories despite hoisting
const mockProvinces = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon'
};
const mockCities = {
  Toronto: { lat: 43.6532, lon: -79.3832, province: 'ON' },
  Vancouver: { lat: 49.2827, lon: -123.1207, province: 'BC' }
};

jest.mock('../../utils/canadianDataSources', () =>
  jest.fn().mockImplementation(() => ({
    getProvinceList: jest.fn(() => mockProvinces),
    getMajorCities: jest.fn(() => mockCities),
    getPostalCodeData: jest.fn(),
    enrichLocationWithCanadianData: jest.fn(),
    searchOpenCanadaDatasets: jest.fn()
  }))
);

const app = require('../../server');
const CanadianDataSources = require('../../utils/canadianDataSources');

let mockInstance;

beforeAll(() => {
  // mock.results[0].value is the returned object from the constructor (has all mock methods)
  // mock.instances[0] is the empty `this` before the implementation ran — not what we want
  mockInstance = CanadianDataSources.mock.results[0].value;
});

afterEach(() => {
  // Reset without jest.clearAllMocks() so mock.instances stays intact
  mockInstance.getProvinceList.mockReturnValue(mockProvinces);
  mockInstance.getMajorCities.mockReturnValue(mockCities);
  mockInstance.getPostalCodeData.mockReset();
  mockInstance.enrichLocationWithCanadianData.mockReset();
  mockInstance.searchOpenCanadaDatasets.mockReset();
});

describe('GET /api/canadian/provinces', () => {
  test('returns all 13 provinces and territories', async () => {
    const res = await request(app).get('/api/canadian/provinces');
    expect(res.status).toBe(200);
    expect(res.body.provinces).toEqual(mockProvinces);
    expect(Object.keys(res.body.provinces)).toHaveLength(13);
  });
});

describe('GET /api/canadian/cities', () => {
  test('returns cities with lat/lon and province', async () => {
    const res = await request(app).get('/api/canadian/cities');
    expect(res.status).toBe(200);
    expect(res.body.major_cities.Toronto).toEqual({
      lat: 43.6532,
      lon: -79.3832,
      province: 'ON'
    });
  });
});

describe('GET /api/canadian/postal-code/:code', () => {
  test('returns 404 when postal code is not found', async () => {
    mockInstance.getPostalCodeData.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/canadian/postal-code/ZZZ999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Postal code not found or invalid');
  });

  test('returns postal code data on success', async () => {
    mockInstance.getPostalCodeData.mockResolvedValueOnce({
      postal_code: 'M5G2C4',
      fsa: 'M5G',
      latitude: 43.6594,
      longitude: -79.3873,
      display_name: 'M5G, Toronto, Ontario, Canada'
    });
    const res = await request(app).get('/api/canadian/postal-code/M5G2C4');
    expect(res.status).toBe(200);
    expect(res.body.postal_code).toBe('M5G2C4');
    expect(res.body.fsa).toBe('M5G');
    expect(res.body.latitude).toBe(43.6594);
  });
});

describe('GET /api/canadian/location-info', () => {
  test('returns 400 when lat is missing', async () => {
    const res = await request(app)
      .get('/api/canadian/location-info')
      .query({ lon: -79.3832 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('returns 400 when lon is missing', async () => {
    const res = await request(app)
      .get('/api/canadian/location-info')
      .query({ lat: 43.6532 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when lat is out of bounds', async () => {
    const res = await request(app)
      .get('/api/canadian/location-info')
      .query({ lat: 200, lon: -79.3832 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lat must be between -90 and 90');
  });

  test('returns 400 when lon is out of bounds', async () => {
    const res = await request(app)
      .get('/api/canadian/location-info')
      .query({ lat: 43.6532, lon: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid coordinates');
    expect(res.body.message).toBe('lon must be between -180 and 180');
  });

  test('returns 404 when location info resolves null', async () => {
    mockInstance.enrichLocationWithCanadianData.mockResolvedValueOnce(null);
    const res = await request(app)
      .get('/api/canadian/location-info')
      .query({ lat: 0, lon: 0 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Location information not found');
  });

  test('returns location info with echoed coordinates on success', async () => {
    mockInstance.enrichLocationWithCanadianData.mockResolvedValueOnce({
      city: 'Toronto',
      province: 'Ontario',
      country: 'Canada',
      postal_code: 'M5H 2N2',
      is_canadian: true
    });
    const res = await request(app)
      .get('/api/canadian/location-info')
      .query({ lat: 43.6532, lon: -79.3832 });
    expect(res.status).toBe(200);
    expect(res.body.coordinates).toEqual({ lat: 43.6532, lon: -79.3832 });
    expect(res.body.city).toBe('Toronto');
    expect(res.body.is_canadian).toBe(true);
  });
});

describe('GET /api/canadian/datasets/search', () => {
  test('returns 400 when q param is missing', async () => {
    const res = await request(app).get('/api/canadian/datasets/search');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Query parameter (q) is required');
  });

  test('returns 404 when no datasets found', async () => {
    mockInstance.searchOpenCanadaDatasets.mockResolvedValueOnce(null);
    const res = await request(app)
      .get('/api/canadian/datasets/search')
      .query({ q: 'nonexistent topic xyz' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No datasets found');
  });

  test('returns dataset results on success', async () => {
    mockInstance.searchOpenCanadaDatasets.mockResolvedValueOnce({
      count: 1,
      results: [{ name: 'health-data', title: 'Health Data', notes: 'desc', url: 'https://example.com' }]
    });
    const res = await request(app)
      .get('/api/canadian/datasets/search')
      .query({ q: 'healthcare', limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.results[0].name).toBe('health-data');
  });
});
