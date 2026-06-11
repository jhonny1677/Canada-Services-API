'use strict';

const { query } = require('../client');

async function findNearby(lat, lon, radiusMeters, category, types) {
  const params = [lat, lon, category, radiusMeters];
  let sql = `
    SELECT
      id, name, category, type,
      lat::float AS lat, lon::float AS lon,
      address, tags,
      ST_Distance(
        geom::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) / 1000.0 AS distance_km
    FROM services
    WHERE category = $3
      AND ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $4
      )`;

  if (types && types.length > 0) {
    params.push(types);
    sql += ` AND type = ANY($${params.length})`;
  }

  sql += '\n    ORDER BY distance_km';

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
    distance: parseFloat(row.distance_km)
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
