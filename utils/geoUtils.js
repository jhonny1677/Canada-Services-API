const axios = require('axios');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

async function geocodeAddress(address) {
  try {
    const nominatimUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
    const encodedAddress = encodeURIComponent(`${address}, Canada`);
    const response = await axios.get(
      `${nominatimUrl}/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1&countrycodes=ca`,
      {
        headers: {
          'User-Agent': 'Canadian-Services-API/1.0.0'
        }
      }
    );
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        display_name: result.display_name,
        address: result.address
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const nominatimUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
    const response = await axios.get(
      `${nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Canadian-Services-API/1.0.0'
        }
      }
    );
    
    if (response.data) {
      return {
        display_name: response.data.display_name,
        address: response.data.address
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
}

function generateBoundingBox(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(lat)));
  
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta
  };
}

function sortByDistance(items, userLat, userLon) {
  return items.map(item => ({
    ...item,
    distance: calculateDistance(userLat, userLon, item.lat, item.lon)
  })).sort((a, b) => a.distance - b.distance);
}

module.exports = {
  calculateDistance,
  geocodeAddress,
  reverseGeocode,
  generateBoundingBox,
  sortByDistance
};