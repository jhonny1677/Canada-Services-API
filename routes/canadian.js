const express = require('express');
const router = express.Router();
const CanadianDataSources = require('../utils/canadianDataSources');

const canadianData = new CanadianDataSources();

router.get('/provinces', (req, res) => {
  res.json({
    provinces: canadianData.getProvinceList()
  });
});

router.get('/cities', (req, res) => {
  res.json({
    major_cities: canadianData.getMajorCities()
  });
});

router.get('/postal-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const cacheKey = `postal_code_${code}`;
    let result = req.cache.get(cacheKey);
    
    if (!result) {
      result = await canadianData.getPostalCodeData(code);
      if (result) {
        req.cache.set(cacheKey, result, 86400);
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