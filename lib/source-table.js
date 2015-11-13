"use strict";

const Table = require('./table');

module.exports = class SourceTable extends Table {
  constructor(schema, name, primaryKeyColumn, nameColumn) {
    super(schema, name);
    this._primaryKeyColumn = primaryKeyColumn;
    this._nameColumn = nameColumn;
  }

  get primaryKeyColumn() {
    return this._primaryKeyColumn;
  }

  get nameColumn() {
    return this._nameColumn;
  }

  static createFromInput(schemaAndTableName, idColumn, nameColumn) {
    let schema = schemaAndTableName.split('.')[0];
    let name = schemaAndTableName.split('.')[1];
    return new SourceTable(schema, name, idColumn, nameColumn);
  }

};
