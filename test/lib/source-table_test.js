"use strict";


const chai = require('chai'),
  expect = chai.expect,
  chance = new (require('chance')).Chance(),
  Table = require('../../lib/table'),
  Sut = require('../../lib/source-table');

describe('source-table', () => {

  let mockPrimaryKeyCol,
    mockNameCol,
    sut;

  beforeEach(() => {
    mockPrimaryKeyCol = chance.word();
    mockNameCol = chance.word();
    sut = new Sut(chance.word(), chance.word(), mockPrimaryKeyCol, mockNameCol);
  });

  it('should be a Table', () => {
    // and therefore inherit all of the tests of Table. Yay!
    expect(sut).to.be.an.instanceOf(Table);
  });

  it('has expected properties', () => {
    expect(sut).to.have.property('primaryKeyColumn')
      .that.is.a('string')
      .that.eql(mockPrimaryKeyCol);
    expect(sut).to.have.property('nameColumn')
      .that.is.a('string')
      .that.eql(mockNameCol);
  });

  describe('createFromInput', () => {
    it('should parse schema and table name', () => {
      let schema = chance.word(),
        name = chance.word(),
        schemaAndTable = `${schema}.${name}`;
      var srcTbl = Sut.createFromInput(schemaAndTable, mockPrimaryKeyCol, mockNameCol);
      expect(srcTbl).to.be.an.instanceOf(Sut);
      expect(srcTbl).to.have.property('schema')
        .that.is.a('string')
        .that.eql(schema);
      expect(srcTbl).to.have.property('name')
        .that.is.a('string')
        .that.eql(name);
      expect(srcTbl).to.have.property('primaryKeyColumn')
        .that.is.a('string')
        .that.eql(mockPrimaryKeyCol);
      expect(srcTbl).to.have.property('nameColumn')
        .that.is.a('string')
        .that.eql(mockNameCol);
    });

    it('should strip double quotes from table and schema', () => {
      let schema = chance.word(),
        name = chance.word(),
        schemaAndTable = `"${schema}"."${name}"`;
      var srcTbl = Sut.createFromInput(schemaAndTable, mockPrimaryKeyCol, mockNameCol);
      expect(srcTbl).to.have.property('schema')
        .that.is.a('string')
        .that.eql(schema);
      expect(srcTbl).to.have.property('name')
        .that.is.a('string')
        .that.eql(name);
    });
  });


});
