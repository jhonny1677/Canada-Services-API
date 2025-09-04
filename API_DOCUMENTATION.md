# 📚 Canadian Services API - Complete Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
This API currently does not require authentication but implements rate limiting (100 requests per 15 minutes per IP).

## Response Format
All API responses follow a consistent JSON structure:

```json
{
  "query": {
    "location": {"lat": 43.6532, "lon": -79.3832},
    "radius": 5,
    "limit": 50
  },
  "total": 25,
  "categories": {
    "hospitals": [...],
    "clinics": [...]
  },
  "all": [...]
}
```

## Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-09-04T10:30:00Z"
}
```

## Rate Limiting Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1630435200
```

## Healthcare Endpoints

### GET /api/healthcare/nearby
Find nearby healthcare facilities including hospitals, clinics, pharmacies, and specialist services.

**Parameters:**
| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `address` | string | No* | - | - | Canadian address to search near |
| `lat` | float | No* | - | - | Latitude coordinate |
| `lon` | float | No* | - | - | Longitude coordinate |
| `radius` | integer | No | 5 | 50 | Search radius in kilometers |
| `limit` | integer | No | 50 | 200 | Maximum number of results |
| `type` | string | No | all | - | Healthcare facility type filter |

*Either `address` or `lat`/`lon` is required.

**Healthcare Types:**
- `hospital` - Hospitals and medical centers
- `clinic` - Medical clinics and walk-in centers
- `pharmacy` - Pharmacies and drug stores
- `dentist` - Dental offices
- `doctor` - Doctor offices and medical practices

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/healthcare/nearby?address=Toronto,ON&radius=10&limit=20&type=hospital"
```

**Example Response:**
```json
{
  "query": {
    "location": {"lat": 43.6532, "lon": -79.3832},
    "radius": 10,
    "limit": 20,
    "type": "hospital"
  },
  "total": 5,
  "categories": {
    "hospitals": [
      {
        "id": "way/123456789",
        "name": "Toronto General Hospital",
        "amenity": "hospital",
        "lat": 43.6591,
        "lon": -79.3877,
        "distance": 0.8,
        "address": "200 Elizabeth St, Toronto, ON M5G 2C4",
        "phone": "+1-416-340-4800",
        "website": "https://www.uhn.ca/",
        "opening_hours": "24/7",
        "emergency": "yes",
        "specialties": ["Emergency", "Cardiology", "Oncology"],
        "accessibility": "wheelchair"
      }
    ]
  }
}
```

### GET /api/healthcare/types
Get list of available healthcare facility types.

**Example Response:**
```json
{
  "types": [
    {
      "key": "hospital",
      "name": "Hospitals",
      "description": "General hospitals and medical centers"
    },
    {
      "key": "clinic", 
      "name": "Clinics",
      "description": "Medical clinics and walk-in centers"
    }
  ]
}
```

## Retail Services Endpoints

### GET /api/retail/nearby
Find nearby retail stores, restaurants, and commercial services.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `address` | string | No* | - | Address to search near |
| `lat` | float | No* | - | Latitude coordinate |
| `lon` | float | No* | - | Longitude coordinate |
| `radius` | integer | No | 5 | Search radius (1-50 km) |
| `limit` | integer | No | 50 | Max results (1-200) |
| `category` | string | No | all | Service category filter |
| `shop_type` | string | No | - | Comma-separated shop types |

**Categories:**
- `grocery` - Supermarkets, grocery stores, convenience stores
- `food` - Restaurants, fast food, cafes, bars
- `retail` - Clothing, electronics, department stores
- `automotive` - Gas stations, car repair, dealerships
- `services` - Banks, post offices, government services

**Shop Types:**
- `supermarket`, `convenience`, `pharmacy`, `gas_station`
- `restaurant`, `fast_food`, `cafe`, `bar`, `bank`
- `clothing`, `electronics`, `department_store`, `mall`

**Example Request:**
```bash
curl "http://localhost:3000/api/retail/nearby?address=Vancouver,BC&category=grocery&radius=5&limit=15"
```

### GET /api/retail/categories
Get list of retail categories and shop types.

**Example Response:**
```json
{
  "categories": {
    "grocery": {
      "name": "Grocery & Food",
      "shop_types": ["supermarket", "convenience", "organic"]
    },
    "food": {
      "name": "Restaurants & Dining", 
      "shop_types": ["restaurant", "fast_food", "cafe", "bar"]
    }
  }
}
```

## Geographic Utilities

### GET /api/utils/geocode
Convert an address to GPS coordinates.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Address to geocode |
| `country` | string | No | Country code (default: CA) |

**Example Request:**
```bash
curl "http://localhost:3000/api/utils/geocode?address=CN Tower, Toronto, ON"
```

**Example Response:**
```json
{
  "address": "CN Tower, Toronto, ON",
  "result": {
    "latitude": 43.6426,
    "longitude": -79.3871,
    "formatted_address": "290 Bremner Blvd, Toronto, ON M5V 3L9, Canada",
    "components": {
      "street_number": "290",
      "street_name": "Bremner Boulevard",
      "city": "Toronto",
      "province": "Ontario",
      "postal_code": "M5V 3L9",
      "country": "Canada"
    },
    "confidence": 0.95
  }
}
```

### GET /api/utils/reverse-geocode
Convert GPS coordinates to an address.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | Yes | Latitude coordinate |
| `lon` | float | Yes | Longitude coordinate |

**Example Request:**
```bash
curl "http://localhost:3000/api/utils/reverse-geocode?lat=49.2827&lon=-123.1207"
```

### GET /api/utils/distance
Calculate distance between two points.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat1` | float | Yes | First point latitude |
| `lon1` | float | Yes | First point longitude |
| `lat2` | float | Yes | Second point latitude |
| `lon2` | float | Yes | Second point longitude |
| `unit` | string | No | Distance unit (km/mi, default: km) |

**Example Response:**
```json
{
  "distance": {
    "kilometers": 3456.2,
    "miles": 2147.1,
    "nautical_miles": 1866.4
  },
  "from": {"lat": 49.2827, "lon": -123.1207},
  "to": {"lat": 45.5017, "lon": -73.5673}
}
```

## Canadian Data Services

### GET /api/canadian/provinces
Get list of Canadian provinces and territories.

**Example Response:**
```json
{
  "provinces": [
    {
      "code": "ON",
      "name": "Ontario",
      "capital": "Toronto",
      "population": 14734014,
      "area_km2": 1076395
    }
  ]
}
```

### GET /api/canadian/cities
Get list of major Canadian cities.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `province` | string | No | Filter by province code |
| `min_population` | integer | No | Minimum population |

### GET /api/canadian/postal-code/:code
Lookup postal code information.

**Example Request:**
```bash
curl "http://localhost:3000/api/canadian/postal-code/M5V3A8"
```

**Example Response:**
```json
{
  "postal_code": "M5V3A8",
  "valid": true,
  "location": {
    "latitude": 43.6426,
    "longitude": -79.3871,
    "city": "Toronto",
    "province": "Ontario",
    "province_code": "ON"
  },
  "demographics": {
    "population": 52000,
    "median_income": 75000
  }
}
```

### GET /api/canadian/location-info
Get detailed Canadian location information from coordinates.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | Yes | Latitude coordinate |
| `lon` | float | Yes | Longitude coordinate |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_COORDINATES` | 400 | Invalid latitude or longitude values |
| `ADDRESS_REQUIRED` | 400 | Either address or coordinates required |
| `GEOCODING_FAILED` | 404 | Address not found or not in Canada |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | External API temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Response Times

| Endpoint | Typical Response Time | Notes |
|----------|----------------------|-------|
| Healthcare/Retail nearby | 500-2000ms | Depends on radius and limit |
| Geocoding | 200-800ms | Cached for 24 hours |
| Canadian data | 50-200ms | Mostly static data |
| Distance calculation | 10-50ms | Local calculation |

## Best Practices

### Caching
- Responses are cached for 1 hour
- Geocoding results cached for 24 hours
- Use consistent parameters for cache hits

### Performance
- Use smaller radius values when possible
- Limit results to what you need
- Batch similar requests together
- Consider caching responses on your end

### Error Handling
- Always check HTTP status codes
- Implement exponential backoff for rate limits
- Handle network timeouts gracefully
- Log errors for debugging

### Rate Limiting
- Current limit: 100 requests per 15 minutes
- Monitor rate limit headers
- Implement client-side rate limiting
- Contact us for higher limits