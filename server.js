const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const NodeCache = require('node-cache');
require('dotenv').config();

const { createLimiter } = require('./middleware/rateLimiter');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const healthcareRoutes = require('./routes/healthcare');
const retailRoutes = require('./routes/retail');
const utilsRoutes = require('./routes/utils');
const canadianRoutes = require('./routes/canadian');

const app = express();
const PORT = process.env.PORT || 3000;

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 3600 });

const limiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000
);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE').split(','),
  allowedHeaders: (process.env.CORS_HEADERS || 'Content-Type,Authorization').split(',')
}));
app.use(limiter);
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());

app.use((req, res, next) => {
  req.cache = cache;
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'Canadian Services API',
    version: '1.0.0',
    endpoints: {
      healthcare: '/api/healthcare/nearby',
      retail: '/api/retail/nearby',
      utils: '/api/utils/geocode',
      canadian: '/api/canadian/provinces'
    }
  });
});

app.use('/api/healthcare', healthcareRoutes);
app.use('/api/retail', retailRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/canadian', canadianRoutes);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Service health check
 *     description: Returns current health status, server uptime, and active environment. Used by Render's built-in health monitoring and the Dockerfile HEALTHCHECK.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600.123
 *                 environment:
 *                   type: string
 *                   example: production
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2024-01-15T10:30:00.000Z'
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Canadian Services API running on port ${PORT}`);
});

module.exports = app;