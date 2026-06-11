-- -----------------------------------------------------------------------
-- services indexes
-- -----------------------------------------------------------------------

-- Primary spatial index — powers ST_DWithin radius queries
CREATE INDEX IF NOT EXISTS idx_services_geom
  ON services USING GIST (geom);

-- Narrows the spatial search to a single category before the GIST scan
CREATE INDEX IF NOT EXISTS idx_services_category
  ON services (category);

-- Supports type-level filtering within a category
CREATE INDEX IF NOT EXISTS idx_services_type
  ON services (type);

-- -----------------------------------------------------------------------
-- geocode_cache indexes
-- -----------------------------------------------------------------------

-- Exact-match lookup by the raw query string
CREATE INDEX IF NOT EXISTS idx_geocode_cache_query
  ON geocode_cache (query);

-- Lets a maintenance job or query efficiently find and purge stale rows
CREATE INDEX IF NOT EXISTS idx_geocode_cache_expires_at
  ON geocode_cache (expires_at);

-- -----------------------------------------------------------------------
-- postal_cache indexes
-- -----------------------------------------------------------------------

-- Exact-match lookup by the normalised postal code string
CREATE INDEX IF NOT EXISTS idx_postal_cache_postal_code
  ON postal_cache (postal_code);
