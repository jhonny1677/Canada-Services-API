'use strict';

const { query } = require('../client');

// Bounding-box constants — 1 degree latitude ≈ 111,111 m; longitude degree
// shrinks with cos(lat).  The box is a fast B-tree pre-filter; the inline
// Haversine confirms the exact radius and drives ORDER BY.
const HAVERSINE_SQL = `
  2 * 6371000 * ASIN(
    SQRT(
      POWER(SIN(RADIANS((lat::float - $1) / 2)), 2) +
      COS(RADIANS($1)) * COS(RADIANS(lat::float)) *
      POWER(SIN(RADIANS((lon::float - $2) / 2)), 2)
    )
  )`.trim();

async function findNearby(lat, lon, radiusMeters, category, types) {
  const params = [lat, lon, category, radiusMeters];

  let sql = `
    SELECT
      id, name, category, type,
      lat::float AS lat, lon::float AS lon,
      address, tags,
      ${HAVERSINE_SQL} AS distance_m
    FROM services
    WHERE category = $3
      AND lat::float BETWEEN $1 - $4 / 111111.0
                         AND $1 + $4 / 111111.0
      AND lon::float BETWEEN $2 - $4 / (111111.0 * COS(RADIANS($1)))
                         AND $2 + $4 / (111111.0 * COS(RADIANS($1)))
      AND ${HAVERSINE_SQL} <= $4`;

  if (types && types.length > 0) {
    params.push(types);
    sql += ` AND type = ANY($${params.length})`;
  }

  sql += '\n    ORDER BY distance_m';

  const result = await query(sql, params);
  return result.rows.map(row => ({
    id: row.id,
    type: row.tags?._osm_type || 'node',
    lat: row.lat,
    lon: row.lon,
    name: row.name,
    amenity: row.type,
    address: row.address,
    phone: row.tags?.phone || null,
    website: row.tags?.website || null,
    opening_hours: row.tags?.opening_hours || null,
    tags: row.tags,
    distance: parseFloat(row.distance_m) / 1000.0
  }));
}

async function upsertServices(services, category) {
  if (!services || services.length === 0) return;

  const values = [];
  const params = [];
  let idx = 1;

  for (const svc of services) {
    values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},'overpass')`);
    const tags = Object.assign({}, svc.tags || {}, { _osm_type: svc.type });
    params.push(
      svc.name || 'Unnamed',
      category,
      svc.amenity || 'unknown',
      svc.lat,
      svc.lon,
      svc.address || null,
      JSON.stringify(tags)
    );
    idx += 7;
  }

  await query(
    `INSERT INTO services (name, category, type, lat, lon, address, tags, source)
     VALUES ${values.join(',')}
     ON CONFLICT (name, lat, lon) DO UPDATE
       SET updated_at = NOW(),
           tags       = EXCLUDED.tags,
           address    = EXCLUDED.address`,
    params
  );
}

async function getDistinctTypes(category) {
  const result = await query(
    'SELECT DISTINCT type FROM services WHERE category = $1 ORDER BY type',
    [category]
  );
  return result.rows.map(r => r.type);
}

module.exports = { findNearby, upsertServices, getDistinctTypes };
