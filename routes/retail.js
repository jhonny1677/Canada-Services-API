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
          req.cache.set(cacheKey, geocodeResult, 3600);
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

router.get('/categories', (req, res) => {
  res.json({
    categories: SHOP_CATEGORIES,
    description: 'Available shop categories for filtering retail results'
  });
});

module.exports = router;