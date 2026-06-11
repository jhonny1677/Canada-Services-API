'use strict';

const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL pool error', { message: err.message });
  });
}

async function query(text, params) {
  if (!pool) throw new Error('Database not configured');
  return pool.query(text, params);
}

async function getClient() {
  if (!pool) throw new Error('Database not configured');
  return pool.connect();
}

module.exports = { query, getClient, pool };
