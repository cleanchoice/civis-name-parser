"use strict";


const chai = require('chai'),
  expect = chai.expect,
  chance = new (require('chance')).Chance(),
  Sut = require('../../lib/table');

describe('table', () => {

  let mockSchema,
    mockTable,
    sut;

  beforeEach(() => {
    mockSchema = chance.word();
    mockTable = chance.word();
    sut = new Sut(mockSchema, mockTable);
  });

  it('has expected properties', () => {
    expect(sut).to.have.property('schema')
      .that.is.a('string')
      .that.eql(mockSchema);
    expect(sut).to.have.property('name')
      .that.is.a('string')
      .that.eql(mockTable);
  });

  describe('toString', () => {

    it('returns quoted pieces', () => {
      expect(sut.toString()).to.eql(`"${mockSchema}"."${mockTable}"`);
    });

  });

  describe('createFromInput', () => {
    it('should parse schema and table name', () => {
      let schema = chance.word(),
        name = chance.word(),
        schemaAndTable = `${schema}.${name}`;
      var srcTbl = Sut.createFromInput(schemaAndTable);
      expect(srcTbl).to.be.an.instanceOf(Sut);
      expect(srcTbl).to.have.property('schema')
        .that.is.a('string')
        .that.eql(schema);
      expect(srcTbl).to.have.property('name')
        .that.is.a('string')
        .that.eql(name);
    });

    it('should strip double quotes from table and schema', () => {
      let schema = chance.word(),
        name = chance.word(),
        schemaAndTable = `"${schema}"."${name}"`;
      var srcTbl = Sut.createFromInput(schemaAndTable);
      expect(srcTbl).to.have.property('schema')
        .that.is.a('string')
        .that.eql(schema);
      expect(srcTbl).to.have.property('name')
        .that.is.a('string')
        .that.eql(name);
    });
  });
});
