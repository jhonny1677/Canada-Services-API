const express = require('express');
const router = express.Router();
const { geocodeAddress, generateBoundingBox, sortByDistance } = require('../utils/geoUtils');
const OverpassAPI = require('../utils/overpassApi');

const overpass = new OverpassAPI();

const SHOP_CATEGORIES = {
  grocery: ['supermarket', 'convenience', 'grocery'],
  food: ['bakery', 'butcher', 'seafood', 'deli', 'greengrocer'],
  retail: ['department_store', 'mall', 'clothes', 'shoes', 'jewelry'],
  electronics: ['electronics', 'computer', 'mobile_phone'],
  automotive: ['car', 'car_repair', 'fuel'],
  services: ['hairdresser', 'beauty', 'laundry', 'dry_cleaning'],
  home: ['furniture', 'hardware', 'garden_centre', 'florist'],
  books: ['books', 'stationery', 'newsagent']
};

/**
 * @swagger
 * /api/retail/nearby:
 *   get:
 *     summary: Find nearby retail stores
 *     description: Returns shops and retail stores near a given location. Filter by broad category or specific OSM shop types. Provide either lat/lon or an address string.
 *     tags: [Retail]
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
 *         example: 200 King Street West Toronto ON
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [grocery, food, retail, electronics, automotive, services, home, books]
 *         description: Broad shop category filter (see /api/retail/categories for the full mapping)
 *         example: grocery
 *       - in: query
 *         name: shop_type
 *         schema:
 *           type: string
 *         description: Comma-separated list of specific OSM shop type values
 *         example: supermarket,convenience
 *     responses:
 *       200:
 *         description: Stores found, sorted by distance
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
 *                     category:
 *                       type: string
 *                       nullable: true
 *                       example: grocery
 *                     shop_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: [supermarket, convenience]
 *                 total:
 *                   type: integer
 *                   example: 14
 *                 categories:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/ServiceFacility'
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
    const { lat, lon, address, radius = 5, limit = 50, category, shop_type } = req.query;

    if (!lat && !lon && !address) {
      return res.status(400).json({
        error: 'Either lat/lon coordinates or address is required'
      });
    }

    let userLat, userLon;

    if (address) {
      const cacheKey = `geocode_${address}`;
      let geocodeResult = req.cache.get(cacheKey);

      if (!geocodeResult) {
        geocodeResult = await geocodeAddress(address);
        if (geocodeResult) {
          req.cache.set(cacheKey, geocodeResult, parseInt(process.env.GEOCODE_CACHE_TTL_SECONDS) || 86400);
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

    const bbox = generateBoundingBox(userLat, userLon, radiusKm);

    let shopTypes = [];
    if (category && SHOP_CATEGORIES[category]) {
      shopTypes = SHOP_CATEGORIES[category];
    } else if (shop_type) {
      shopTypes = shop_type.split(',');
    }

    const cacheKey = `retail_${Math.round(userLat * 100)}_${Math.round(userLon * 100)}_${radiusKm}_${shopTypes.join('_')}`;

    const query = overpass.buildRetailQuery(bbox, shopTypes, limitNum);
    const data = await overpass.query(query, req.cache, cacheKey);

    let stores = overpass.parseElements(data);
    stores = sortByDistance(stores, userLat, userLon);
    stores = stores.filter(store => store.distance <= radiusKm);

    const categorized = {};
    Object.keys(SHOP_CATEGORIES).forEach(cat => {
      categorized[cat] = stores.filter(s =>
        SHOP_CATEGORIES[cat].includes(s.amenity) ||
        SHOP_CATEGORIES[cat].includes(s.tags?.shop)
      );
    });
    categorized.other = stores.filter(s =>
      !Object.values(SHOP_CATEGORIES).flat().includes(s.amenity) &&
      !Object.values(SHOP_CATEGORIES).flat().includes(s.tags?.shop)
    );

    res.json({
      query: {
        location: { lat: userLat, lon: userLon },
        radius: radiusKm,
        limit: limitNum,
        category: category || null,
        shop_types: shopTypes
      },
      total: stores.length,
      categories: categorized,
      all: stores
    });

  } catch (error) {
    console.error('Retail API error:', error);
    res.status(500).json({
      error: 'Failed to fetch retail stores',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/retail/categories:
 *   get:
 *     summary: List supported retail categories and shop types
 *     description: Returns the category-to-shop-type mapping used by the nearby endpoint's category filter.
 *     tags: [Retail]
 *     responses:
 *       200:
 *         description: Category map and description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: string
 *                   example:
 *                     grocery: [supermarket, convenience, grocery]
 *                     electronics: [electronics, computer, mobile_phone]
 *                 description:
 *                   type: string
 *                   example: Available shop categories for filtering retail results
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: SHOP_CATEGORIES,
    description: 'Available shop categories for filtering retail results'
  });
});

module.exports = router;
