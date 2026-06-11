const express = require('express');
const router = express.Router();
const { geocodeAddress, reverseGeocode, calculateDistance } = require('../utils/geoUtils');
const { createLimiter } = require('../middleware/rateLimiter');
const geocodeQueries = require('../db/queries/geocode');

const geocodeLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_GEOCODE_MAX_REQUESTS) || 30,
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000
);

/**
 * @swagger
 * /api/utils/geocode:
 *   get:
 *     summary: Geocode a Canadian address
 *     description: Converts a free-text Canadian address into latitude/longitude coordinates using Nominatim. This endpoint proxies an external API and has a stricter per-window rate limit than the global limit (controlled by RATE_LIMIT_GEOCODE_MAX_REQUESTS).
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Canadian address string to resolve
 *         example: 200 Elizabeth Street Toronto ON
 *     responses:
 *       200:
 *         description: Resolved coordinates and address details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   example: 43.6591
 *                 longitude:
 *                   type: number
 *                   example: -79.3873
 *                 display_name:
 *                   type: string
 *                   example: 200 Elizabeth Street, Toronto, Ontario, Canada
 *                 address:
 *                   type: object
 *                   description: Structured address components returned by Nominatim
 *       400:
 *         description: Address parameter missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Address parameter is required
 *       404:
 *         description: Address not found in Canada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Address not found or not in Canada
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many requests
 *                 retryAfter:
 *                   type: integer
 *                   description: Seconds until the rate limit window resets
 *                   example: 900
 *       500:
 *         description: Geocoding service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/geocode', geocodeLimiter, async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: 'Address parameter is required'
      });
    }

    const geocodeTtl = parseInt(process.env.GEOCODE_CACHE_TTL_SECONDS) || 86400;
    const cacheKey = `geocode_${address}`;
    let result = req.cache.get(cacheKey);

    if (!result) {
      try {
        const row = await geocodeQueries.getCachedGeocode(address);
        if (row) {
          result = { latitude: row.lat, longitude: row.lon, display_name: row.display_name, address: row.address_json };
          req.cache.set(cacheKey, result, geocodeTtl);
        }
      } catch (_) {}
    }

    if (!result) {
      result = await geocodeAddress(address);
      if (result) {
        req.cache.set(cacheKey, result, geocodeTtl);
        try {
          await geocodeQueries.setCachedGeocode(address, result.latitude, result.longitude, result.display_name, result.address, geocodeTtl);
        } catch (_) {}
      }
    }

    if (!result) {
      return res.status(404).json({
        error: 'Address not found or not in Canada'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      error: 'Failed to geocode address',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/utils/reverse-geocode:
 *   get:
 *     summary: Reverse geocode coordinates
 *     description: Converts latitude/longitude coordinates into a human-readable address using Nominatim. This endpoint proxies an external API and has a stricter per-window rate limit than the global limit (controlled by RATE_LIMIT_GEOCODE_MAX_REQUESTS).
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude (must be between -90 and 90)
 *         example: 43.6532
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude (must be between -180 and 180)
 *         example: -79.3832
 *     responses:
 *       200:
 *         description: Address resolved from coordinates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   example: 43.6532
 *                 longitude:
 *                   type: number
 *                   example: -79.3832
 *                 display_name:
 *                   type: string
 *                   example: City Hall, 100 Queen Street West, Toronto, Ontario, Canada
 *                 address:
 *                   type: object
 *                   description: Structured address components returned by Nominatim
 *       400:
 *         description: Missing, invalid, or out-of-range coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid coordinates
 *               message: lat must be between -90 and 90
 *       404:
 *         description: No location found at those coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Location not found
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many requests
 *                 retryAfter:
 *                   type: integer
 *                   description: Seconds until the rate limit window resets
 *                   example: 900
 *       500:
 *         description: Geocoding service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/reverse-geocode', geocodeLimiter, async (req, res) => {
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

    const cacheKey = `reverse_${Math.round(latitude * 1000)}_${Math.round(longitude * 1000)}`;
    let result = req.cache.get(cacheKey);

    if (!result) {
      result = await reverseGeocode(latitude, longitude);
      if (result) {
        req.cache.set(cacheKey, result, 3600);
      }
    }

    if (!result) {
      return res.status(404).json({
        error: 'Location not found'
      });
    }

    res.json({
      latitude,
      longitude,
      ...result
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      error: 'Failed to reverse geocode coordinates',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/utils/distance:
 *   get:
 *     summary: Calculate distance between two coordinates
 *     description: Computes the great-circle distance between two lat/lon pairs using the Haversine formula. Returns the result in both kilometres and miles.
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: lat1
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude of the first point (must be between -90 and 90)
 *         example: 43.6532
 *       - in: query
 *         name: lon1
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude of the first point (must be between -180 and 180)
 *         example: -79.3832
 *       - in: query
 *         name: lat2
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude of the second point (must be between -90 and 90)
 *         example: 45.4215
 *       - in: query
 *         name: lon2
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude of the second point (must be between -180 and 180)
 *         example: -75.6972
 *     responses:
 *       200:
 *         description: Distance in kilometres and miles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 from:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                       example: 43.6532
 *                     lon:
 *                       type: number
 *                       example: -79.3832
 *                 to:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                       example: 45.4215
 *                     lon:
 *                       type: number
 *                       example: -75.6972
 *                 distance_km:
 *                   type: number
 *                   example: 351.72
 *                 distance_miles:
 *                   type: number
 *                   example: 218.47
 *       400:
 *         description: Missing, invalid, or out-of-range coordinates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid coordinates
 *               message: lat must be between -90 and 90
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Too many requests
 *                 retryAfter:
 *                   type: integer
 *                   description: Seconds until the rate limit window resets
 *                   example: 900
 *       500:
 *         description: Calculation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/distance', geocodeLimiter, (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.query;

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return res.status(400).json({
        error: 'All parameters (lat1, lon1, lat2, lon2) are required'
      });
    }

    const latitude1 = parseFloat(lat1);
    const longitude1 = parseFloat(lon1);
    const latitude2 = parseFloat(lat2);
    const longitude2 = parseFloat(lon2);

    if ([latitude1, longitude1, latitude2, longitude2].some(isNaN)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided'
      });
    }

    if (latitude1 < -90 || latitude1 > 90 || latitude2 < -90 || latitude2 > 90) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'lat must be between -90 and 90'
      });
    }

    if (longitude1 < -180 || longitude1 > 180 || longitude2 < -180 || longitude2 > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'lon must be between -180 and 180'
      });
    }

    const distance = calculateDistance(latitude1, longitude1, latitude2, longitude2);

    res.json({
      from: { lat: latitude1, lon: longitude1 },
      to: { lat: latitude2, lon: longitude2 },
      distance_km: Math.round(distance * 100) / 100,
      distance_miles: Math.round(distance * 0.621371 * 100) / 100
    });

  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate distance',
      message: error.message
    });
  }
});

module.exports = router;
