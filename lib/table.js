"use strict";

module.exports = class Table {
  constructor(schema, name) {
    this._schema = schema;
    this._name = name;
  }

  get schema() {
    return this._schema;
  }

  get name() {
    return this._name;
  }

  toString() {
    return `"${this._schema}"."${this._name}"`;
  }

  static createFromInput(schemaAndTableName) {
    let schema = schemaAndTableName.split('.')[0].replace(/"/g, '');
    let name = schemaAndTableName.split('.')[1].replace(/"/g, '');
    return new Table(schema, name);
  }
};
