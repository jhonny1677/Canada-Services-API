'use strict';

require('dotenv').config();
const { query, pool } = require('./client');

async function main() {
  const expiresAt = new Date(Date.now() + 86400 * 1000); // 24 h from now

  console.log('1. Inserting row into geocode_cache...');
  const insert = await query(
    `INSERT INTO geocode_cache (query, lat, lon, display_name, address_json, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, query, lat, lon, expires_at`,
    [
      'smoke-test: Toronto, ON',
      43.6532,
      -79.3832,
      'Toronto, Ontario, Canada',
      JSON.stringify({ city: 'Toronto', country: 'Canada' }),
      expiresAt
    ]
  );
  console.log('   inserted:', insert.rows[0]);

  console.log('2. Querying row back (confirming expires_at > NOW())...');
  const select = await query(
    `SELECT id,
            query,
            lat::float AS lat,
            lon::float AS lon,
            expires_at,
            (expires_at > NOW()) AS expires_in_future
     FROM geocode_cache
     WHERE query = $1`,
    ['smoke-test: Toronto, ON']
  );
  const row = select.rows[0];
  console.log('   row:', row);
  if (!row.expires_in_future) {
    throw new Error('expires_at is NOT in the future — something is wrong');
  }
  console.log('   ✓ expires_at > NOW() confirmed');

  console.log('3. Deleting row...');
  const del = await query(
    `DELETE FROM geocode_cache WHERE query = $1 RETURNING id`,
    ['smoke-test: Toronto, ON']
  );
  console.log('   deleted id:', del.rows[0].id);

  await pool.end();
  console.log('4. Pool closed. Smoke test passed.');
}

main().catch((err) => {
  console.error('Smoke test FAILED:', err.message);
  process.exit(1);
});
