'use strict';

const { query } = require('../client');

async function getCachedGeocode(address) {
  const result = await query(
    `SELECT lat::float AS lat, lon::float AS lon, display_name, address_json
     FROM geocode_cache
     WHERE query = $1 AND expires_at > NOW()`,
    [address]
  );
  return result.rows[0] || null;
}

async function setCachedGeocode(address, lat, lon, displayName, addressJson, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await query(
    `INSERT INTO geocode_cache (query, lat, lon, display_name, address_json, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (query) DO UPDATE
       SET lat          = EXCLUDED.lat,
           lon          = EXCLUDED.lon,
           display_name = EXCLUDED.display_name,
           address_json = EXCLUDED.address_json,
           expires_at   = EXCLUDED.expires_at`,
    [address, lat, lon, displayName || null, JSON.stringify(addressJson || {}), expiresAt]
  );
}

async function pruneExpiredGeocode() {
  const result = await query('DELETE FROM geocode_cache WHERE expires_at < NOW()');
  return result.rowCount;
}

module.exports = { getCachedGeocode, setCachedGeocode, pruneExpiredGeocode };
