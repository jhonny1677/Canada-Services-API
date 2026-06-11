const express = require('express');
const router = express.Router();
const { geocodeAddress, generateBoundingBox, sortByDistance } = require('../utils/geoUtils');
const OverpassAPI = require('../utils/overpassApi');
const servicesQueries = require('../db/queries/services');
const geocodeQueries = require('../db/queries/geocode');

const overpass = new OverpassAPI();

/**
 * @swagger
 * /api/healthcare/nearby:
 *   get:
 *     summary: Find nearby healthcare facilities
 *     description: Returns hospitals, clinics, pharmacies, dentists, and other healthcare facilities near a given location. Provide either lat/lon or an address string.
 *     tags: [Healthcare]
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude of the search centre (required if address omitted)
 *         example: 43.6532
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude of the search centre (required if address omitted)
 *         example: -79.3832
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Canadian address to geocode instead of lat/lon
 *         example: 200 Elizabeth Street Toronto ON
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5
 *           maximum: 50
 *         description: Search radius in kilometres (capped at 50)
 *         example: 5
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum results to return (capped at 200)
 *         example: 50
 *     responses:
 *       200:
 *         description: Facilities found, sorted by distance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: object
 *                   properties:
 *                     location:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                           example: 43.6532
 *                         lon:
 *                           type: number
 *                           example: -79.3832
 *                     radius:
 *                       type: number
 *                       example: 5
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                 total:
 *                   type: integer
 *                   example: 7
 *                 categories:
 *                   type: object
 *                   properties:
 *                     hospitals:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceFacility'
 *                     clinics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceFacility'
 *                     doctors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceFacility'
 *                     pharmacies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceFacility'
 *                     dentists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceFacility'
 *                     other:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ServiceFacility'
 *                 all:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceFacility'
 *       400:
 *         description: Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid coordinates
 *               message: lat must be between -90 and 90
 *       404:
 *         description: Address could not be geocoded
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
 *         description: Upstream API or server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lon, address, radius = 5, limit = 50 } = req.query;

    if (!lat && !lon && !address) {
      return res.status(400).json({
        error: 'Either lat/lon coordinates or address is required'
      });
    }

    let userLat, userLon;

    if (address) {
      const geocodeTtl = parseInt(process.env.GEOCODE_CACHE_TTL_SECONDS) || 86400;
      const l1Key = `geocode_${address}`;
      let geocodeResult = req.cache.get(l1Key);

      if (!geocodeResult) {
        try {
          const row = await geocodeQueries.getCachedGeocode(address);
          if (row) {
            geocodeResult = { latitude: row.lat, longitude: row.lon, display_name: row.display_name, address: row.address_json };
            req.cache.set(l1Key, geocodeResult, geocodeTtl);
          }
        } catch (_) {}
      }

      if (!geocodeResult) {
        geocodeResult = await geocodeAddress(address);
        if (geocodeResult) {
          req.cache.set(l1Key, geocodeResult, geocodeTtl);
          try {
            await geocodeQueries.setCachedGeocode(address, geocodeResult.latitude, geocodeResult.longitude, geocodeResult.display_name, geocodeResult.address, geocodeTtl);
          } catch (_) {}
        }
      }

      if (!geocodeResult) {
        return res.status(404).json({
          error: 'Address not found or not in Canada'
        });
      }

      userLat = geocodeResult.latitude;
      userLon = geocodeResult.longitude;
    } else {
      userLat = parseFloat(lat);
      userLon = parseFloat(lon);

      if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({
          error: 'Invalid latitude or longitude'
        });
      }

      if (userLat < -90 || userLat > 90) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          message: 'lat must be between -90 and 90'
        });
      }

      if (userLon < -180 || userLon > 180) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          message: 'lon must be between -180 and 180'
        });
      }
    }

    const radiusKm = Math.min(parseFloat(radius), 50);
    const limitNum = Math.min(parseInt(limit), 200);
    const serviceTtl = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
    const l1Key = `healthcare_${Math.round(userLat * 100)}_${Math.round(userLon * 100)}_${radiusKm}`;

    let facilities = req.cache.get(l1Key);

    if (!facilities) {
      try {
        const rows = await servicesQueries.findNearby(userLat, userLon, radiusKm * 1000, 'healthcare');
        if (rows.length > 0) {
          facilities = rows;
          req.cache.set(l1Key, facilities, serviceTtl);
        }
      } catch (_) {}
    }

    if (!facilities) {
      const bbox = generateBoundingBox(userLat, userLon, radiusKm);
      const overpassQuery = overpass.buildHealthcareQuery(bbox, limitNum);
      const data = await overpass.query(overpassQuery, null, null);
      facilities = overpass.parseElements(data);
      facilities = sortByDistance(facilities, userLat, userLon);
      facilities = facilities.filter(f => f.distance <= radiusKm);
      try {
        await servicesQueries.upsertServices(facilities, 'healthcare');
      } catch (_) {}
      req.cache.set(l1Key, facilities, serviceTtl);
    }

    const categorized = {
      hospitals: facilities.filter(f => f.amenity === 'hospital'),
      clinics: facilities.filter(f => f.amenity === 'clinic'),
      doctors: facilities.filter(f => f.amenity === 'doctors'),
      pharmacies: facilities.filter(f => f.amenity === 'pharmacy'),
      dentists: facilities.filter(f => f.amenity === 'dentist'),
      other: facilities.filter(f => !['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'].includes(f.amenity))
    };

    res.json({
      query: {
        location: { lat: userLat, lon: userLon },
        radius: radiusKm,
        limit: limitNum
      },
      total: facilities.length,
      categories: categorized,
      all: facilities
    });

  } catch (error) {
    console.error('Healthcare API error:', error);
    res.status(500).json({
      error: 'Failed to fetch healthcare facilities',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/healthcare/types:
 *   get:
 *     summary: List supported healthcare facility types
 *     description: Returns all OSM amenity values that the nearby endpoint recognises and categorises.
 *     tags: [Healthcare]
 *     responses:
 *       200:
 *         description: Map of amenity keys to human-readable labels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 healthcare_types:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   example:
 *                     hospital: Hospitals and medical centers
 *                     clinic: Medical clinics
 *                     doctors: Doctor offices
 *                     pharmacy: Pharmacies and drug stores
 *                     dentist: Dental offices
 *                     healthcare: Other healthcare facilities
 */
router.get('/types', async (req, res) => {
  const typesMap = {
    hospital: 'Hospitals and medical centers',
    clinic: 'Medical clinics',
    doctors: 'Doctor offices',
    pharmacy: 'Pharmacies and drug stores',
    dentist: 'Dental offices',
    healthcare: 'Other healthcare facilities'
  };

  try {
    const dbTypes = await servicesQueries.getDistinctTypes('healthcare');
    dbTypes.forEach(t => { if (!typesMap[t]) typesMap[t] = t; });
  } catch (_) {}

  res.json({ healthcare_types: typesMap });
});

module.exports = router;
