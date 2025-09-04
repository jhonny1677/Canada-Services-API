const express = require('express');
const router = express.Router();
const { geocodeAddress, generateBoundingBox, sortByDistance } = require('../utils/geoUtils');
const OverpassAPI = require('../utils/overpassApi');

const overpass = new OverpassAPI();

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
    const cacheKey = `healthcare_${Math.round(userLat * 100)}_${Math.round(userLon * 100)}_${radiusKm}`;
    
    const query = overpass.buildHealthcareQuery(bbox, limitNum);
    const data = await overpass.query(query, req.cache, cacheKey);
    
    let facilities = overpass.parseElements(data);
    facilities = sortByDistance(facilities, userLat, userLon);
    facilities = facilities.filter(facility => facility.distance <= radiusKm);

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

router.get('/types', (req, res) => {
  res.json({
    healthcare_types: {
      hospital: 'Hospitals and medical centers',
      clinic: 'Medical clinics',
      doctors: 'Doctor offices',
      pharmacy: 'Pharmacies and drug stores',
      dentist: 'Dental offices',
      healthcare: 'Other healthcare facilities'
    }
  });
});

module.exports = router;