-- Auto-update trigger function shared by all tables with updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------
-- services
-- Stores parsed facility records sourced from the Overpass API.
-- Radius queries use a bounding-box B-tree pre-filter + inline Haversine
-- rather than PostGIS, so this works on any standard PostgreSQL instance.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL,
  category    TEXT          NOT NULL CHECK (category IN ('healthcare', 'retail')),
  type        TEXT          NOT NULL,
  lat         NUMERIC(10,7) NOT NULL,
  lon         NUMERIC(10,7) NOT NULL,
  address     TEXT,
  tags        JSONB,
  source      TEXT          NOT NULL DEFAULT 'overpass',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (name, lat, lon)
);

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------
-- geocode_cache
-- Persists Nominatim forward-geocode responses so repeated lookups of the
-- same address string skip the external HTTP call.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geocode_cache (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  query        TEXT          UNIQUE NOT NULL,
  lat          NUMERIC(10,7) NOT NULL,
  lon          NUMERIC(10,7) NOT NULL,
  display_name TEXT,
  address_json JSONB,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ   NOT NULL
);

-- -----------------------------------------------------------------------
-- postal_cache
-- Persists Nominatim FSA (Forward Sortation Area) lookups.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS postal_cache (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  postal_code  TEXT          UNIQUE NOT NULL,
  lat          NUMERIC(10,7) NOT NULL,
  lon          NUMERIC(10,7) NOT NULL,
  display_name TEXT,
  fsa          TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ   NOT NULL
);
