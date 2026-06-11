'use strict';

const { query } = require('../client');

async function getCachedPostal(code) {
  const result = await query(
    `SELECT lat::float AS lat, lon::float AS lon, display_name, fsa
     FROM postal_cache
     WHERE postal_code = $1 AND expires_at > NOW()`,
    [code]
  );
  return result.rows[0] || null;
}

async function setCachedPostal(code, lat, lon, displayName, fsa, ttlSeconds) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await query(
    `INSERT INTO postal_cache (postal_code, lat, lon, display_name, fsa, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (postal_code) DO UPDATE
       SET lat          = EXCLUDED.lat,
           lon          = EXCLUDED.lon,
           display_name = EXCLUDED.display_name,
           fsa          = EXCLUDED.fsa,
           expires_at   = EXCLUDED.expires_at`,
    [code, lat, lon, displayName || null, fsa || null, expiresAt]
  );
}

module.exports = { getCachedPostal, setCachedPostal };
