"use strict";

module.exports = class Table {
  constructor(schema, name, primaryKeyColumn, nameColumn) {
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
};
