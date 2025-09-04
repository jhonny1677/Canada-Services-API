const express = require('express');
const router = express.Router();
const { geocodeAddress, reverseGeocode, calculateDistance } = require('../utils/geoUtils');

router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({
        error: 'Address parameter is required'
      });
    }

    const cacheKey = `geocode_${address}`;
    let result = req.cache.get(cacheKey);
    
    if (!result) {
      result = await geocodeAddress(address);
      if (result) {
        req.cache.set(cacheKey, result, 3600);
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

router.get('/reverse-geocode', async (req, res) => {
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

router.get('/distance', (req, res) => {
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