'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('geocode_cache', {
    id:           { type: 'uuid',          primaryKey: true, default: pgm.func('gen_random_uuid()') },
    query:        { type: 'text',          notNull: true,    unique: true },
    lat:          { type: 'numeric(10,7)', notNull: true },
    lon:          { type: 'numeric(10,7)', notNull: true },
    display_name: { type: 'text' },
    address_json: { type: 'jsonb' },
    created_at:   { type: 'timestamptz',  notNull: true, default: pgm.func('NOW()') },
    expires_at:   { type: 'timestamptz',  notNull: true }
  }, { ifNotExists: true });

  pgm.createIndex('geocode_cache', 'query',      { name: 'idx_geocode_cache_query',      ifNotExists: true });
  pgm.createIndex('geocode_cache', 'expires_at', { name: 'idx_geocode_cache_expires_at', ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('geocode_cache', 'expires_at', { name: 'idx_geocode_cache_expires_at', ifExists: true });
  pgm.dropIndex('geocode_cache', 'query',      { name: 'idx_geocode_cache_query',      ifExists: true });
  pgm.dropTable('geocode_cache', { ifExists: true });
};
