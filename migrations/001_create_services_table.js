'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('postgis', { ifNotExists: true });

  // Shared trigger function for updated_at columns
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Use raw SQL for the table because the generated geom column requires
  // PostGIS syntax that node-pg-migrate's createTable API cannot express.
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS services (
      id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT          NOT NULL,
      category   TEXT          NOT NULL CHECK (category IN ('healthcare', 'retail')),
      type       TEXT          NOT NULL,
      lat        NUMERIC(10,7) NOT NULL,
      lon        NUMERIC(10,7) NOT NULL,
      geom       GEOMETRY(Point, 4326)
                   GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED,
      address    TEXT,
      tags       JSONB,
      source     TEXT          NOT NULL DEFAULT 'overpass',
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      UNIQUE (name, lat, lon)
    )
  `);

  // Idempotent trigger creation
  pgm.sql(`
    DO $do$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_services_updated_at'
      ) THEN
        CREATE TRIGGER trg_services_updated_at
          BEFORE UPDATE ON services
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $do$
  `);

  pgm.createIndex('services', 'geom',     { name: 'idx_services_geom',     method: 'gist', ifNotExists: true });
  pgm.createIndex('services', 'category', { name: 'idx_services_category', ifNotExists: true });
  pgm.createIndex('services', 'type',     { name: 'idx_services_type',     ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('services', 'type',     { name: 'idx_services_type',     ifExists: true });
  pgm.dropIndex('services', 'category', { name: 'idx_services_category', ifExists: true });
  pgm.dropIndex('services', 'geom',     { name: 'idx_services_geom',     ifExists: true });
  pgm.sql('DROP TRIGGER IF EXISTS trg_services_updated_at ON services');
  pgm.sql('DROP FUNCTION IF EXISTS set_updated_at()');
  pgm.dropTable('services', { ifExists: true });
};
