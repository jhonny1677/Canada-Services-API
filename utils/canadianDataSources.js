const axios = require('axios');

class CanadianDataSources {
  constructor() {
    this.statCanBaseUrl = 'https://www150.statcan.gc.ca/t1/wds/rest';
    this.openCanadaBaseUrl = 'https://open.canada.ca/data/api/action';
  }

  async getHealthcareFacilitiesFromStatCan(province = null) {
    try {
      const params = {
        lang: 'E',
        productId: '14100355'
      };

      if (province) {
        params.dguid = province;
      }

      const response = await axios.get(`${this.statCanBaseUrl}/getFullTableDownload`, {
        params,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('StatCan API error:', error.message);
      return null;
    }
  }

  async searchOpenCanadaDatasets(query, limit = 10) {
    try {
      const response = await axios.get(`${this.openCanadaBaseUrl}/package_search`, {
        params: {
          q: query,
          rows: limit,
          fq: 'organization:statcan'
        },
        timeout: 15000
      });

      return response.data.result;
    } catch (error) {
      console.error('Open Canada API error:', error.message);
      return null;
    }
  }

  async getPostalCodeData(postalCode) {
    try {
      const cleanedCode = postalCode.replace(/\s/g, '').toUpperCase();
      
      if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanedCode)) {
        throw new Error('Invalid Canadian postal code format');
      }

      const fsa = cleanedCode.substring(0, 3);
      
      const nominatimUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
      const response = await axios.get(
        `${nominatimUrl}/search?format=json&q=${fsa}&countrycodes=ca&limit=1`,
        {
          headers: {
            'User-Agent': 'Canadian-Services-API/1.0.0'
          }
        }
      );

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          postal_code: cleanedCode,
          fsa: fsa,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          display_name: result.display_name
        };
      }

      return null;
    } catch (error) {
      console.error('Postal code lookup error:', error.message);
      return null;
    }
  }

  getProvinceList() {
    return {
      'AB': 'Alberta',
      'BC': 'British Columbia',
      'MB': 'Manitoba',
      'NB': 'New Brunswick',
      'NL': 'Newfoundland and Labrador',
      'NT': 'Northwest Territories',
      'NS': 'Nova Scotia',
      'NU': 'Nunavut',
      'ON': 'Ontario',
      'PE': 'Prince Edward Island',
      'QC': 'Quebec',
      'SK': 'Saskatchewan',
      'YT': 'Yukon'
    };
  }

  getMajorCities() {
    return {
      'Toronto': { lat: 43.6532, lon: -79.3832, province: 'ON' },
      'Montreal': { lat: 45.5017, lon: -73.5673, province: 'QC' },
      'Vancouver': { lat: 49.2827, lon: -123.1207, province: 'BC' },
      'Calgary': { lat: 51.0447, lon: -114.0719, province: 'AB' },
      'Edmonton': { lat: 53.5461, lon: -113.4938, province: 'AB' },
      'Ottawa': { lat: 45.4215, lon: -75.6972, province: 'ON' },
      'Winnipeg': { lat: 49.8951, lon: -97.1384, province: 'MB' },
      'Quebec City': { lat: 46.8139, lon: -71.2080, province: 'QC' },
      'Hamilton': { lat: 43.2557, lon: -79.8711, province: 'ON' },
      'Kitchener': { lat: 43.4643, lon: -80.5204, province: 'ON' },
      'London': { lat: 42.9849, lon: -81.2453, province: 'ON' },
      'Halifax': { lat: 44.6488, lon: -63.5752, province: 'NS' },
      'St. Catharines': { lat: 43.1594, lon: -79.2469, province: 'ON' },
      'Victoria': { lat: 48.4284, lon: -123.3656, province: 'BC' },
      'Saskatoon': { lat: 52.1579, lon: -106.6702, province: 'SK' },
      'Regina': { lat: 50.4452, lon: -104.6189, province: 'SK' },
      'St. Johns': { lat: 47.5615, lon: -52.7126, province: 'NL' }
    };
  }

  async enrichLocationWithCanadianData(lat, lon, cache = null) {
    const cacheKey = `canadian_data_${Math.round(lat * 1000)}_${Math.round(lon * 1000)}`;
    
    if (cache) {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    try {
      const nominatimUrl = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
      const response = await axios.get(
        `${nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=10`,
        {
          headers: {
            'User-Agent': 'Canadian-Services-API/1.0.0'
          }
        }
      );

      if (response.data && response.data.address) {
        const address = response.data.address;
        const result = {
          city: address.city || address.town || address.village || address.municipality,
          province: address.state || address.province,
          country: address.country,
          postal_code: address.postcode,
          is_canadian: address.country_code === 'ca'
        };

        if (cache) {
          cache.set(cacheKey, result, 3600);
        }

        return result;
      }

      return null;
    } catch (error) {
      console.error('Location enrichment error:', error.message);
      return null;
    }
  }
}

module.exports = CanadianDataSources;