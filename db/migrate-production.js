'use strict';

const path = require('path');
const logger = require('../utils/logger');

async function runMigrations() {
  let runner = require('node-pg-migrate');
  if (runner && runner.default) runner = runner.default;

  logger.info('Running migrations...');

  await runner({
    databaseUrl: process.env.DATABASE_URL,
    migrationsTable: 'pgmigrations',
    dir: path.join(__dirname, '..', 'migrations'),
    direction: 'up',
    count: Infinity,
    verbose: false,
    log: (msg) => { if (msg && msg.trim()) logger.info(msg.trim()); }
  });

  logger.info('Migrations complete');
}

module.exports = { runMigrations };
