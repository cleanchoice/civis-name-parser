"use strict";

const Promise = require('bluebird'),
  chai = require('chai'),
  _ = require('lodash'),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  chaiAsPromised = require('chai-as-promised'),
  chance = new (require('chance')).Chance(),
  proxyquire = require('proxyquire'),
  AwsCredential = require('../../lib/aws-credential'),
  RunnerResult = require('../../lib/runner-result'),
  Table = require('../../lib/table');
chai.use(chaiAsPromised);
chai.use(sinonChai);


describe('runner', () => {

  let sut,
    mockCivis,
    mockParser,
    fakeUnloadQueryId,
    fakeCopyFromQueryId,
    fakeAwsCreds,
    fakeTableName,
    fakeIdColumn,
    fakeNameColumn,
    fakeBucketName,
    fakeDestination,
    fakeSchema;

  beforeEach(() => {


    fakeSchema = chance.word();
    fakeTableName = `"${fakeSchema}"."${chance.word()}"`;
    fakeIdColumn = chance.word();
    fakeNameColumn = chance.word();
    fakeBucketName = chance.word();
    fakeDestination = `"${chance.word()}"."${chance.word()}"`;

    fakeUnloadQueryId = chance.integer({min:1, max: 1234});
    fakeCopyFromQueryId = chance.integer({min:1, max: 1234});

    fakeAwsCreds = new AwsCredential(chance.word(), chance.word(), chance.word());

    mockCivis = sinon.stub({
      createQueryJob: () => {},
      createTemporaryS3Credentials: () => {},
      delayUntilQueryCompletion: () => {}
    });

    mockCivis.createTemporaryS3Credentials.returns(Promise.resolve(fakeAwsCreds));
    mockCivis.createQueryJob.withArgs(sinon.match(/UNLOAD/)).returns(Promise.resolve(fakeUnloadQueryId));
    mockCivis.createQueryJob.withArgs(sinon.match(/COPY/)).returns(Promise.resolve(fakeCopyFromQueryId));
    mockCivis.delayUntilQueryCompletion.returns(Promise.resolve(1234 /* not used */))


    mockParser = class {
      static parse(result) {
        result.parsed = true;
        return Promise.resolve(result);
      }
    };

    let ProxySut = proxyquire('../../lib/runner', {
      './name-parser': mockParser
    })

    sut = new ProxySut(mockCivis);

  });


  describe('run assertions and setup', () => {

    it('requires bucketName', (done) => {
      let fn = function() {
        sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, null);
      };
      expect(fn).to.throw(/bucketName is required/);
      done();
    });

    it('requires tableName', (done) => {
      let fn = function() {
        sut.run(null, fakeIdColumn, fakeNameColumn, fakeBucketName);
      };
      expect(fn).to.throw(/tableName is required/);
      done();
    });

    it('requires idColumn', (done) => {
      let fn = function() {
        sut.run(fakeTableName, null, fakeNameColumn, fakeBucketName);
      };
      expect(fn).to.throw(/idColumn is required/);
      done();
    });

    it('requires nameColumn', (done) => {
      let fn = function() {
        sut.run(fakeTableName, fakeIdColumn, null, fakeBucketName);
      };
      expect(fn).to.throw(/nameColumn is required/);
      done();
    });

    it('does not require destination', (done) => {
      sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName).then((result) => {
        expect(result.destinationTable).to.have.property('schema').that.eql(fakeSchema);
        expect(result.destinationTable).to.have.property('name').that.eql('parsed_names');

        done();
      }).catch(done);
    });

    it('uses destination if specified', (done) => {
      sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
        let destTable = result.destinationTable.toString();
        expect(destTable).to.eql(fakeDestination);

        done();
      }).catch(done);
    });

    it('sets source table', (done) => {
      sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
        let srcTable = result.sourceTable.toString();
        expect(srcTable).to.eql(fakeTableName);

        done();
      }).catch(done);

    });

    it('sets bucket properties', (done) => {
      sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
        expect(result).to.have.property('bucket').that.eql(fakeBucketName);
        expect(result).to.have.property('sourcePrefix').that.matches(/parsed\-names\/\d{8}\-\d{6}\/input/);
        expect(result).to.have.property('destinationPrefix').that.matches(/parsed\-names\/\d{8}\-\d{6}\/output/);

        done();
      }).catch(done);
    });


  });

  it('creates s3 creds', (done) => {
    sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
      expect(mockCivis.createTemporaryS3Credentials).to.have.been.calledOnce;
      expect(result.awsCredential).to.eql(fakeAwsCreds);
      done();
    }).catch(done);
  });

  it('sets queryJobId to first query job', (done) => {
    sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
      expect(result.queryJobId).to.eql(fakeUnloadQueryId);
      done();
    }).catch(done);
  });

  it('creates 2 query jobs', (done) => {
    sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
      expect(mockCivis.createQueryJob).to.have.been.calledTwice;
      done();
    }).catch(done);
  });

  it('delays for 2 query jobs', (done) => {
    sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
      expect(mockCivis.delayUntilQueryCompletion).to.have.been.calledTwice;
      expect(mockCivis.delayUntilQueryCompletion.withArgs(fakeUnloadQueryId)).to.have.been.calledOnce;
      expect(mockCivis.delayUntilQueryCompletion.withArgs(fakeCopyFromQueryId)).to.have.been.calledOnce;
      done();
    }).catch(done);
  });

  it('sends to NameParser', (done) => {
    sut.run(fakeTableName, fakeIdColumn, fakeNameColumn, fakeBucketName, fakeDestination).then((result) => {
      expect(result).to.have.property('parsed').that.is.true;
      done();
    }).catch(done);
  });

  //TODO: write matchers for queries...
  //it('creates unload query')

});
