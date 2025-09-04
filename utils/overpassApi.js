const axios = require('axios');

class OverpassAPI {
  constructor() {
    this.baseURL = 'https://overpass-api.de/api/interpreter';
    this.timeout = 30000;
  }

  async query(overpassQuery, cache = null, cacheKey = null) {
    if (cache && cacheKey) {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      const response = await axios.post(this.baseURL, overpassQuery, {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'Canadian-Services-API/1.0.0'
        },
        timeout: this.timeout
      });

      const result = response.data;
      
      if (cache && cacheKey) {
        cache.set(cacheKey, result, 1800);
      }

      return result;
    } catch (error) {
      console.error('Overpass API error:', error.message);
      throw new Error(`Failed to fetch data from Overpass API: ${error.message}`);
    }
  }

  buildHealthcareQuery(bbox, limit = 100) {
    return `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="clinic"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="doctors"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="pharmacy"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="dentist"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["healthcare"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="hospital"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="clinic"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="doctors"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="pharmacy"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="dentist"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["healthcare"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out center meta ${limit};
    `;
  }

  buildRetailQuery(bbox, shopTypes = [], limit = 100) {
    let queries = [];
    
    if (shopTypes.length === 0) {
      queries = [
        `node["shop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`,
        `way["shop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`
      ];
    } else {
      shopTypes.forEach(shopType => {
        queries.push(`node["shop"="${shopType}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`);
        queries.push(`way["shop"="${shopType}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`);
      });
    }

    return `
      [out:json][timeout:25];
      (
        ${queries.join('\n        ')}
      );
      out center meta ${limit};
    `;
  }

  buildServiceQuery(bbox, amenityTypes = [], limit = 100) {
    let queries = [];
    
    amenityTypes.forEach(amenityType => {
      queries.push(`node["amenity"="${amenityType}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`);
      queries.push(`way["amenity"="${amenityType}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});`);
    });

    return `
      [out:json][timeout:25];
      (
        ${queries.join('\n        ')}
      );
      out center meta ${limit};
    `;
  }

  parseElements(data) {
    if (!data || !data.elements) {
      return [];
    }

    return data.elements.map(element => {
      const lat = element.lat || (element.center && element.center.lat);
      const lon = element.lon || (element.center && element.center.lon);
      
      return {
        id: element.id,
        type: element.type,
        lat: lat,
        lon: lon,
        name: element.tags?.name || 'Unnamed',
        amenity: element.tags?.amenity || element.tags?.shop || element.tags?.healthcare,
        address: this.formatAddress(element.tags),
        phone: element.tags?.phone,
        website: element.tags?.website,
        opening_hours: element.tags?.opening_hours,
        tags: element.tags
      };
    }).filter(item => item.lat && item.lon);
  }

  formatAddress(tags) {
    if (!tags) return null;
    
    const parts = [];
    if (tags['addr:housenumber'] && tags['addr:street']) {
      parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
    } else if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }
    
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:state'] || tags['addr:province']) {
      parts.push(tags['addr:state'] || tags['addr:province']);
    }
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    
    return parts.length > 0 ? parts.join(', ') : null;
  }
}

module.exports = OverpassAPI;