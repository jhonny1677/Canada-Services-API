const express = require('express');
const router = express.Router();
const CanadianDataSources = require('../utils/canadianDataSources');
const postalQueries = require('../db/queries/postal');

const canadianData = new CanadianDataSources();

/**
 * @swagger
 * /api/canadian/provinces:
 *   get:
 *     summary: List all Canadian provinces and territories
 *     description: Returns the complete list of Canadian provinces and territories with their two-letter abbreviation codes.
 *     tags: [Canadian Data]
 *     responses:
 *       200:
 *         description: Province and territory code-to-name map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provinces:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     ON: Ontario
 *                     BC: British Columbia
 *                     QC: Quebec
 */
router.get('/provinces', (req, res) => {
  res.json({
    provinces: canadianData.getProvinceList()
  });
});

/**
 * @swagger
 * /api/canadian/cities:
 *   get:
 *     summary: List major Canadian cities
 *     description: Returns a static list of major Canadian cities with their coordinates and province abbreviation.
 *     tags: [Canadian Data]
 *     responses:
 *       200:
 *         description: City name to coordinate and province map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 major_cities:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 43.6532
 *                       lon:
 *                         type: number
 *                         example: -79.3832
 *                       province:
 *                         type: string
 *                         example: ON
 */
router.get('/cities', (req, res) => {
  res.json({
    major_cities: canadianData.getMajorCities()
  });
});

/**
 * @swagger
 * /api/canadian/postal-code/{code}:
 *   get:
 *     summary: Look up a Canadian postal code
 *     description: Returns approximate coordinates and a display name for a Canadian postal code using the Forward Sortation Area (first three characters).
 *     tags: [Canadian Data]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Canadian postal code — spaces optional (e.g. M5G2C4 or M5G 2C4)
 *         example: M5G2C4
 *     responses:
 *       200:
 *         description: Coordinates and metadata for the postal code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 postal_code:
 *                   type: string
 *                   example: M5G2C4
 *                 fsa:
 *                   type: string
 *                   example: M5G
 *                 latitude:
 *                   type: number
 *                   example: 43.6594
 *                 longitude:
 *                   type: number
 *                   example: -79.3873
 *                 display_name:
 *                   type: string
 *                   example: M5G, Toronto, Ontario, Canada
 *       404:
 *         description: Postal code not found or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Postal code not found or invalid
 *       500:
 *         description: Lookup service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/postal-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const postalTtl = parseInt(process.env.GEOCODE_CACHE_TTL_SECONDS) || 86400;
    const cacheKey = `postal_code_${code}`;
    let result = req.cache.get(cacheKey);

    if (!result) {
      try {
        const row = await postalQueries.getCachedPostal(code);
        if (row) {
          result = { postal_code: code, fsa: row.fsa, latitude: row.lat, longitude: row.lon, display_name: row.display_name };
          req.cache.set(cacheKey, result, postalTtl);
        }
      } catch (_) {}
    }

    if (!result) {
      result = await canadianData.getPostalCodeData(code);
      if (result) {
        req.cache.set(cacheKey, result, postalTtl);
        try {
          await postalQueries.setCachedPostal(code, result.latitude, result.longitude, result.display_name, result.fsa, postalTtl);
        } catch (_) {}
      }
    }

    if (!result) {
      return res.status(404).json({
        error: 'Postal code not found or invalid'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Postal code lookup error:', error);
    res.status(500).json({
      error: 'Failed to lookup postal code',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/canadian/location-info:
 *   get:
 *     summary: Get Canadian location details for coordinates
 *     description: Reverse-geocodes coordinates and returns city, province, postal code, and a flag indicating whether the location is in Canada.
 *     tags: [Canadian Data]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *         example: 43.6532
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *         example: -79.3832
 *     responses:
 *       200:
 *         description: Canadian location details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coordinates:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                       example: 43.6532
 *                     lon:
 *                       type: number
 *                       example: -79.3832
 *                 city:
 *                   type: string
 *                   nullable: true
 *                   example: Toronto
 *                 province:
 *                   type: string
 *                   nullable: true
 *                   example: Ontario
 *                 country:
 *                   type: string
 *                   example: Canada
 *                 postal_code:
 *                   type: string
 *                   nullable: true
 *                   example: M5H 2N2
 *                 is_canadian:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing or invalid coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Both lat and lon parameters are required
 *       404:
 *         description: Location information not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Location information not found
 *       500:
 *         description: Lookup service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/location-info', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Both lat and lon parameters are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid latitude or longitude'
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'lat must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'lon must be between -180 and 180'
      });
    }

    const locationInfo = await canadianData.enrichLocationWithCanadianData(
      latitude,
      longitude,
      req.cache
    );

    if (!locationInfo) {
      return res.status(404).json({
        error: 'Location information not found'
      });
    }

    res.json({
      coordinates: { lat: latitude, lon: longitude },
      ...locationInfo
    });

  } catch (error) {
    console.error('Location info error:', error);
    res.status(500).json({
      error: 'Failed to get location information',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/canadian/datasets/search:
 *   get:
 *     summary: Search Statistics Canada open datasets
 *     description: Searches the Open Canada CKAN catalog filtered to Statistics Canada datasets.
 *     tags: [Canadian Data]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: healthcare workforce
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of dataset results to return
 *         example: 10
 *     responses:
 *       200:
 *         description: Matching datasets from the Open Canada catalog
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: health-workforce-data
 *                       title:
 *                         type: string
 *                         example: Health Workforce Data
 *                       notes:
 *                         type: string
 *                         example: Dataset description from Statistics Canada
 *                       url:
 *                         type: string
 *                         example: https://open.canada.ca/data/en/dataset/...
 *       400:
 *         description: Missing query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Query parameter (q) is required
 *       404:
 *         description: No datasets found matching the query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: No datasets found
 *       500:
 *         description: Open Canada API error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/datasets/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Query parameter (q) is required'
      });
    }

    const cacheKey = `datasets_${q}_${limit}`;
    let result = req.cache.get(cacheKey);

    if (!result) {
      result = await canadianData.searchOpenCanadaDatasets(q, parseInt(limit));
      if (result) {
        req.cache.set(cacheKey, result, 3600);
      }
    }

    if (!result) {
      return res.status(404).json({
        error: 'No datasets found'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Dataset search error:', error);
    res.status(500).json({
      error: 'Failed to search datasets',
      message: error.message
    });
  }
});

module.exports = router;
