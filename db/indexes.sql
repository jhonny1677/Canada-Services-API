-- -----------------------------------------------------------------------
-- services indexes
-- -----------------------------------------------------------------------

-- Bounding-box pre-filter for radius queries (replaces PostGIS GIST)
CREATE INDEX IF NOT EXISTS idx_services_lat
  ON services (lat);

CREATE INDEX IF NOT EXISTS idx_services_lon
  ON services (lon);

-- Narrows the bounding-box scan to a single category
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
