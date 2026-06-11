const swaggerJsdoc = require('swagger-jsdoc');
const { version } = require('../package.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Canada Services API',
      version,
      description:
        'Comprehensive REST API for discovering nearby services across Canada — healthcare facilities, retail stores, and geographic utilities powered by OpenStreetMap and Statistics Canada data.',
      contact: { url: 'https://github.com/jhonny1677/Canada-Services-API' },
      license: { name: 'ISC' }
    },
    servers: [
      {
        url: process.env.SERVER_URL || 'http://localhost:3000',
        description: 'API Server'
      }
    ],
    tags: [
      { name: 'Healthcare', description: 'Nearby healthcare facility lookups' },
      { name: 'Retail', description: 'Nearby retail and shop lookups' },
      { name: 'Utilities', description: 'Geocoding and distance calculation' },
      { name: 'Canadian Data', description: 'Provinces, cities, postal codes, and Statistics Canada datasets' },
      { name: 'Health', description: 'Service health and uptime' }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Something went wrong' },
            message: { type: 'string', example: 'Detailed error description (development only)' }
          }
        },
        ServiceFacility: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 123456789 },
            type: { type: 'string', enum: ['node', 'way'] },
            lat: { type: 'number', example: 43.6532 },
            lon: { type: 'number', example: -79.3832 },
            name: { type: 'string', example: 'Toronto General Hospital' },
            amenity: { type: 'string', example: 'hospital' },
            address: { type: 'string', nullable: true, example: '200 Elizabeth Street, Toronto, ON' },
            phone: { type: 'string', nullable: true, example: '+1-416-340-4800' },
            website: { type: 'string', nullable: true, example: 'https://www.uhn.ca' },
            opening_hours: { type: 'string', nullable: true, example: 'Mo-Fr 09:00-17:00' },
            distance: { type: 'number', example: 1.24, description: 'Distance in km from the query location' }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.js']
};

module.exports = swaggerJsdoc(options);
