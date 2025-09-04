const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const NodeCache = require('node-cache');
require('dotenv').config();

const healthcareRoutes = require('./routes/healthcare');
const retailRoutes = require('./routes/retail');
const utilsRoutes = require('./routes/utils');
const canadianRoutes = require('./routes/canadian');

const app = express();
const PORT = process.env.PORT || 3000;

const cache = new NodeCache({ stdTTL: 3600 });

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
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

app.use((err, req, res, next) => {
  console.error(err.stack);
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