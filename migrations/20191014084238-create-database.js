"use strict";

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable("wohnungen", {
    columns: {
      id: {
        type: "int",
        primaryKey: true,
        autoIncrement: true,
        unsigned: true
      },
      website: { type: "text", notNull: true },
      websiteId: { type: "text", notNull: true },
      url: "text",
      latitude: "decimal",
      longitude: "decimal",
      rooms: "decimal",
      size: "decimal",
      price: "decimal",
      data: "text",
      free_from: "datetime",
      active: { type: "boolean", defaultValue: true },
      gone: { type: "boolean", defaultValue: false },
      favorite: { type: "boolean", defaultValue: false },
      comment: "text",
      added: {
        type: "datetime",
        defaultValue: new String("CURRENT_TIMESTAMP")
      },
      removed: { type: "datetime", defaultValue: new String("NULL") }
    },
    ifNotExists: true
  });
};

exports.down = function(db) {
  return db.dropTable("wohnungen", {
    ifExists: true
  });
};

exports._meta = {
  version: 1
};
