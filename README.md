[![CI](https://github.com/jhonny1677/Canada-Services-API/actions/workflows/ci.yml/badge.svg)](https://github.com/jhonny1677/Canada-Services-API/actions/workflows/ci.yml)
[![Live API](https://img.shields.io/badge/Live%20API-online-brightgreen)](https://canada-services-api.onrender.com/health)

# 🇨🇦 Canadian Services API

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1+-blue.svg)](https://expressjs.com/)
[![API](https://img.shields.io/badge/API-REST-orange.svg)](https://restfulapi.net/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

A comprehensive REST API for discovering nearby services across Canada, integrating multiple data sources including OpenStreetMap, Statistics Canada, and government datasets. Perfect for location-based applications, mobile apps, and service discovery platforms.

## 🚀 Live Demo & Quick Start

```bash
# Clone and setup
git clone https://github.com/jhonny1677/Canada-Services-API.git
cd Canada-Services-API
npm install

# Start the server
npm start

# Test the API
curl http://localhost:3000/api/healthcare/nearby?address=Toronto,ON&radius=10
```

**Demo Server**: `http://localhost:3000` (after running locally)

## ✨ Key Features

### 🏥 Healthcare Services
- **Hospital Locator**: Find nearby hospitals and medical centers
- **Clinic Finder**: Locate medical clinics and walk-in centers
- **Pharmacy Search**: Discover nearby pharmacies and drug stores
- **Specialist Services**: Find dentists, optometrists, and specialists
- **Emergency Services**: Locate urgent care and emergency facilities

### 🛒 Retail & Commercial Services
- **Grocery Stores**: Find supermarkets, convenience stores, and specialty food shops
- **Shopping Centers**: Locate malls, department stores, and retail outlets
- **Restaurants**: Discover dining options, fast food, and specialty cuisines
- **Automotive Services**: Find gas stations, repair shops, and car dealerships
- **Professional Services**: Banks, post offices, government services

### 🌍 Geographic Intelligence
- **Smart Geocoding**: Convert addresses to precise coordinates
- **Reverse Geocoding**: Get addresses from GPS coordinates
- **Distance Calculations**: Calculate distances between locations
- **Canadian Postal Codes**: Validate and lookup postal code information
- **Province & City Data**: Access comprehensive Canadian location data

### 🚀 Performance & Reliability
- **In-Memory Caching**: 1-hour response caching for optimal performance
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Error Handling**: Comprehensive error responses with proper HTTP codes
- **Request Validation**: Input sanitization and parameter validation
- **CORS Enabled**: Cross-origin support for web applications

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd canadian-services-api
   npm install
   ```

2. **Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Run the API**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

4. **Test the API**
   ```bash
   curl http://localhost:3000/
   ```

## API Endpoints

### Healthcare Services
- `GET /api/healthcare/nearby` - Find nearby healthcare facilities
- `GET /api/healthcare/types` - List available healthcare types

**Parameters:**
- `lat`, `lon` - Coordinates (alternative to address)
- `address` - Address to search near (alternative to lat/lon)
- `radius` - Search radius in km (default: 5, max: 50)
- `limit` - Maximum results (default: 50, max: 200)

**Example:**
```bash
curl "http://localhost:3000/api/healthcare/nearby?address=Toronto,ON&radius=10&limit=20"
```

### Retail Services
- `GET /api/retail/nearby` - Find nearby retail stores
- `GET /api/retail/categories` - List retail categories

**Parameters:**
- `lat`, `lon` - Coordinates (alternative to address)
- `address` - Address to search near
- `radius` - Search radius in km (default: 5, max: 50)
- `limit` - Maximum results (default: 50, max: 200)
- `category` - Filter by category (grocery, food, retail, etc.)
- `shop_type` - Specific shop types (comma-separated)

**Example:**
```bash
curl "http://localhost:3000/api/retail/nearby?address=Vancouver,BC&category=grocery&radius=5"
```

### Geographic Utilities
- `GET /api/utils/geocode` - Convert address to coordinates
- `GET /api/utils/reverse-geocode` - Convert coordinates to address
- `GET /api/utils/distance` - Calculate distance between two points

**Examples:**
```bash
curl "http://localhost:3000/api/utils/geocode?address=123 Main St, Toronto, ON"
curl "http://localhost:3000/api/utils/distance?lat1=43.6532&lon1=-79.3832&lat2=45.5017&lon2=-73.5673"
```

### Canadian Data
- `GET /api/canadian/provinces` - List all Canadian provinces
- `GET /api/canadian/cities` - List major Canadian cities
- `GET /api/canadian/postal-code/:code` - Lookup postal code information
- `GET /api/canadian/location-info` - Get Canadian location details
- `GET /api/canadian/datasets/search` - Search government datasets

**Examples:**
```bash
curl "http://localhost:3000/api/canadian/postal-code/M5V3A8"
curl "http://localhost:3000/api/canadian/location-info?lat=43.6532&lon=-79.3832"
```

## Data Sources

### Free APIs Used
1. **OpenStreetMap Overpass API** - Retail and healthcare location data
2. **Nominatim** - Geocoding and reverse geocoding
3. **Statistics Canada API** - Government healthcare facility data
4. **Open Canada Data** - Government datasets and information

### Supported Service Types

**Healthcare:**
- Hospitals and medical centers
- Medical clinics
- Doctor offices
- Pharmacies and drug stores
- Dental offices
- Other healthcare facilities

**Retail:**
- Supermarkets and grocery stores
- Convenience stores
- Restaurants and food services
- Clothing and shoe stores
- Electronics stores
- Department stores and malls
- Automotive services
- Home and garden centers

## Response Format

All endpoints return JSON responses with the following structure:

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
    "clinics": [...],
    "pharmacies": [...]
  },
  "all": [
    {
      "id": "123456",
      "name": "Toronto General Hospital",
      "amenity": "hospital",
      "lat": 43.6591,
      "lon": -79.3877,
      "distance": 0.8,
      "address": "200 Elizabeth St, Toronto, ON",
      "phone": "+1-416-340-4800",
      "website": "https://www.uhn.ca/",
      "opening_hours": "24/7"
    }
  ]
}
```

## Performance Features

- **In-Memory Caching**: Responses cached for 1 hour (configurable)
- **Geocoding Cache**: Address lookups cached for 24 hours
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Request Optimization**: Parallel API calls where possible

## Configuration Options

Environment variables in `.env`:

```bash
PORT=3000
NODE_ENV=development
CACHE_TTL_SECONDS=3600
GEOCODE_CACHE_TTL_SECONDS=86400
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Error Handling

The API returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Deploying to Render

### Steps

1. **Fork or push this repo to GitHub.**

2. **Create a new Web Service on [render.com](https://render.com)**
   - Click *New* → *Web Service* → connect your GitHub account → select this repo.
   - Render detects `render.yaml` automatically and pre-fills the build/start commands.

3. **Set environment variables** in the Render dashboard under *Environment* before the first deploy.
   See the table below — only `NODE_ENV` and `SERVER_URL` are strictly required; everything else has a working default.

4. **Click *Create Web Service*.** Render runs `npm install` then `node server.js`.

5. **After the first successful deploy**, copy your service URL
   (e.g. `https://canadian-services-api.onrender.com`) and set it as the value of `SERVER_URL`
   in the Render environment tab. Trigger a manual redeploy so Swagger UI reflects the correct base URL.

6. **Verify the deployment:**
   ```
   https://<your-app>.onrender.com/health
   https://<your-app>.onrender.com/docs
   ```

### Environment variables

| Variable | Purpose | Example / Default | Required? |
|---|---|---|---|
| `PORT` | Server port | _Render sets this automatically_ | Auto |
| `NODE_ENV` | Runtime environment | `production` | **Required** |
| `SERVER_URL` | Public URL — shown in Swagger UI | `https://your-app.onrender.com` | **Required** |
| `CACHE_TTL_SECONDS` | Default cache TTL (seconds) | `3600` | Optional |
| `GEOCODE_CACHE_TTL_SECONDS` | Geocode result cache TTL (seconds) | `86400` | Optional |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (milliseconds) | `900000` | Optional |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests / window / IP — global | `100` | Optional |
| `RATE_LIMIT_GEOCODE_MAX_REQUESTS` | Max requests / window / IP — geocode endpoints | `30` | Optional |
| `NOMINATIM_URL` | Nominatim geocoding base URL | `https://nominatim.openstreetmap.org` | Optional |
| `OVERPASS_URL` | Overpass API base URL | `https://overpass-api.de/api` | Optional |
| `LOG_LEVEL` | Winston log level (`error`/`warn`/`info`/`debug`) | `info` | Optional |
| `LOG_FILE` | Log file path | _Leave **empty** on Render — use stdout_ | Do not set |
| `CORS_ORIGIN` | Allowed CORS origins | `*` | Optional |
| `CORS_METHODS` | Allowed HTTP methods | `GET,POST,PUT,DELETE` | Optional |
| `CORS_HEADERS` | Allowed request headers | `Content-Type,Authorization` | Optional |

### Free tier notes

- **Spin-down after inactivity**: Render's free tier suspends the service after **15 minutes of no traffic**. The first request after a cold start takes roughly **30–50 seconds** while the instance boots. Subsequent requests are fast.
- **Ephemeral filesystem**: Do not set `LOG_FILE`. The disk resets on every deploy and restart; all logs must go to stdout, which Render captures in its log dashboard.
- **No persistent cache**: The in-memory `node-cache` resets on every cold start. TTL env vars are irrelevant across restarts.

### Live endpoints

| Endpoint | URL |
|---|---|
| Interactive Swagger UI | `https://<your-app>.onrender.com/docs` |
| OpenAPI JSON spec | `https://<your-app>.onrender.com/docs.json` |
| Health check | `https://<your-app>.onrender.com/health` |
| Healthcare nearby | `https://<your-app>.onrender.com/api/healthcare/nearby` |

## Limitations

- **Rate Limits**: Overpass API and Nominatim have usage limits
- **Data Coverage**: Dependent on OpenStreetMap completeness
- **Real-time Data**: Not all information is real-time
- **Geocoding**: Limited to Canadian addresses for optimal results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test
4. Submit a pull request

## License

ISC License - See LICENSE file for details.

## Support

For issues and questions:
- Check existing GitHub issues
- Create new issue with detailed description
- Include API endpoint, parameters, and error messages