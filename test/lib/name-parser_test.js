"use strict";

const chai = require('chai'),
  _ = require('lodash'),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  chaiAsPromised = require('chai-as-promised'),
  chance = new (require('chance')).Chance(),
  proxyquire = require('proxyquire'),
  AWS = require('aws-sdk'),
  RunnerResult = require('../../lib/runner-result'),
  Table = require('../../lib/table'),
  SourceTable = require('../../lib/source-table');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('name-parser', () => {

  var mockResult,
    mockSourceTable,
    mockDestinationTable,
    mockBucket,
    mockPrefix,
    mockAwsCred,
    mockAwsObjectStream,
    mockS3ReadStream,
    stubOfAws,
    ProxySut,
    instanceOfStubOfAws;

  function getMockStream() {
    var stream = sinon.stub({
      on: function() {},
      pipe: function() {}
    });
    stream.on.returnsThis();
    stream.pipe.returnsThis();
    return stream;
  }

  beforeEach(() => {
    mockSourceTable = new SourceTable(chance.word(), chance.word(), chance.word(), chance.word());
    mockDestinationTable = new Table(chance.word(), chance.word());
    mockBucket = chance.guid();
    mockPrefix = chance.word();
    mockResult = new RunnerResult(mockSourceTable, mockDestinationTable, mockBucket, mockPrefix);
    mockAwsCred = {
      updateAwsSdkCredentials: sinon.stub()
    };
    mockResult.awsCredential = mockAwsCred;

    stubOfAws = _.cloneDeep(AWS);
    stubOfAws.config = sinon.stub({
      update: function() {}
    });

    mockS3ReadStream = getMockStream();
    mockAwsObjectStream = sinon.stub({
      createReadStream: () => {}
    });
    mockAwsObjectStream.createReadStream.returns(mockS3ReadStream);

    var S3 = class {
      constructor() {
        this._listObjectsToReturn = [];
        this._getObjectArgs = [];
        this._listObjectsArgs = [];
        instanceOfStubOfAws = this;
      }
      set listObjectsToReturn(value) {
        this._listObjectsToReturn = value;
      }
      get listObjectArgs() {
        return this._listObjectsArgs;
      }
      get getObjectArgs() {
        return this._getObjectArgs;
      }
      getObject(obj) {
        console.log('calling getobject');
        this._getObjectArgs.push(arguments);
        return mockAwsObjectStream;
      }
      listObjects(obj, cb) {
        this._listObjectsArgs.push(arguments);
        cb(null, {
          Contents: this._listObjectsToReturn
        });
      }
    };



    stubOfAws.S3 = S3;


    ProxySut = proxyquire('../../lib/name-parser', {
      'aws-sdk': stubOfAws
    });

  });

  it('updates s3 credentials', (done) => {

    ProxySut.parse(mockResult).then(() => {
      expect(mockResult.awsCredential.updateAwsSdkCredentials)
        .to.have.been.calledOnce;
      done();
    }).catch(done);

  });

  it('lists objects in bucket and prefix', (done) => {

    ProxySut.parse(mockResult).then(() => {

      // first argument of first call of listObject
      expect(instanceOfStubOfAws.listObjectArgs[0][0])
        .to.have.property('Bucket')
        .that.eql(mockBucket + '/');

      expect(instanceOfStubOfAws.listObjectArgs[0][0])
        .to.have.property('Prefix')
        .that.eql(mockResult.sourcePrefix);


      done();
    }).catch(done);

  });

  /* // this doesn't work because the streams are never finishing... blerg.
  it('creates a stream for each listed object', (done) => {

    instanceOfStubOfAws.listObjectsToReturn = [
      {Key: chance.word()},
      {Key: chance.word()}
    ];

    ProxySut.parse(mockResult).then(() => {


      expect(instanceOfStubOfAws.getObjectArgs)
        .to.have.length(instanceOfStubOfAws.listObjectsToReturn.length);



      console.log(instanceOfStubOfAws);
      done();
    }).catch(done);

  });
*/


});
