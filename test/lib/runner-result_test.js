"use strict";

const chai = require('chai'),
  expect = chai.expect,
  chance = new (require('chance')).Chance(),
  AwsCredential = require('../../lib/aws-credential'),
  Table = require('../../lib/table'),
  SourceTable = require('../../lib/source-table'),
  Sut = require('../../lib/runner-result');

describe('runner-result', () => {

  let sut,
    mockSourceTable,
    mockDestinationTable,
    mockBucket,
    mockPrefix,
    mockAwsCred;

  beforeEach(() => {
    mockSourceTable = new SourceTable(chance.word(), chance.word(), chance.word(), chance.word());
    mockDestinationTable = new Table(chance.word(), chance.word());
    mockBucket = chance.guid();
    mockPrefix = chance.word();
    sut = new Sut(mockSourceTable, mockDestinationTable, mockBucket, mockPrefix);
  });

  it('should have properties that are set by the ctr', () => {
    expect(sut).to.have.property('sourceTable')
      .that.is.an.instanceOf(SourceTable)
      .that.eql(mockSourceTable);
    expect(sut).to.have.property('destinationTable')
      .that.is.an.instanceOf(Table)
      .that.eql(mockDestinationTable);
    expect(sut).to.have.property('startTime')
      .that.is.an.instanceOf(Date);
    expect(sut).to.have.property('bucket')
      .that.is.a('string')
      .that.eql(mockBucket);
    expect(sut).to.have.property('sourcePrefix')
      .that.is.a('string')
      .that.eql(`${mockPrefix}/input`);
    expect(sut).to.have.property('destinationPrefix')
      .that.is.a('string')
      .that.eql(`${mockPrefix}/output`);
    expect(sut).to.have.property('delimiter')
      .that.is.a('string')
      .that.eql('|');

  });

  it('should have properties that are null until set', () => {
    let qjId = chance.integer({min: 1, max: 155});
    expect(sut).to.have.property('queryJobId').that.is.null;
    sut.queryJobId = qjId;
    expect(sut).to.have.property('queryJobId').that.eql(qjId);

    let cred = new AwsCredential(chance.word(), chance.word(), chance.word());
    expect(sut).to.have.property('awsCredential').that.is.null;
    sut.awsCredential = cred;
    expect(sut).to.have.property('awsCredential')
      .that.is.an.instanceOf(AwsCredential)
      .that.eql(cred);

    let rowCount = chance.integer({min: 1, max: 155});

    expect(sut).to.have.property('rowCount').that.is.null;
    sut.rowCount = rowCount;
    expect(sut).to.have.property('rowCount').that.eql(rowCount);

  });

  it('should allow for source and destination prefix overrides', () => {
    let srcPrefix = chance.word(),
      destPrefix = chance.word();

    sut = new Sut(mockSourceTable, mockDestinationTable,
      mockBucket, mockPrefix, srcPrefix, destPrefix);

    expect(sut).to.have.property('sourcePrefix')
      .that.is.a('string')
      .that.eql(`${mockPrefix}/${srcPrefix}`);
    expect(sut).to.have.property('destinationPrefix')
      .that.is.a('string')
      .that.eql(`${mockPrefix}/${destPrefix}`);
  });


});
