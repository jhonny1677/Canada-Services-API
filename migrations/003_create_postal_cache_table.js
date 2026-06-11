'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('postal_cache', {
    id:           { type: 'uuid',          primaryKey: true, default: pgm.func('gen_random_uuid()') },
    postal_code:  { type: 'text',          notNull: true,    unique: true },
    lat:          { type: 'numeric(10,7)', notNull: true },
    lon:          { type: 'numeric(10,7)', notNull: true },
    display_name: { type: 'text' },
    fsa:          { type: 'text' },
    created_at:   { type: 'timestamptz',  notNull: true, default: pgm.func('NOW()') },
    expires_at:   { type: 'timestamptz',  notNull: true }
  }, { ifNotExists: true });

  pgm.createIndex('postal_cache', 'postal_code', { name: 'idx_postal_cache_postal_code', ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('postal_cache', 'postal_code', { name: 'idx_postal_cache_postal_code', ifExists: true });
  pgm.dropTable('postal_cache', { ifExists: true });
};
