"use strict";

const Promise = require('bluebird'),
  _ = require('lodash'),
  chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  chaiAsPromised = require('chai-as-promised'),
  chance = new (require('chance')).Chance(),
  proxyquire = require('proxyquire'),
  Sut = require('../../lib/civis-client');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('civis-client', () => {

  let mockRp,
    fakeTempCredential,
    fakeApiKey,
    fakeDatabase,
    fakeCredential,
    fakeQueryJob,
    fakeQueryJobIds,
    ProxySut,
    sut;

  beforeEach(() => {
    fakeTempCredential = {
      accessKey: chance.hash(),
      secretAccessKey: chance.guid(),
      sessionToken: chance.bb_pin()
    };
    fakeApiKey = chance.guid();
    mockRp = sinon.stub({
      post: () => {},
      defaults: () => {},
      get: () => {}
    });
    fakeDatabase = {
      id : chance.integer({min: 1, max: 222 })
    };
    mockRp.get.withArgs('/databases').returns(Promise.resolve([fakeDatabase]));
    fakeCredential = {
      id : chance.integer({min: 1, max: 222 })
    };
    mockRp.get.withArgs('/credentials').returns(Promise.resolve([fakeCredential]));
    mockRp.post.withArgs(sinon.match(/\/credentials\/\d+\/temporary/i))
      .returns(Promise.resolve(fakeTempCredential));

    fakeQueryJob = {
      id: chance.integer({min: 1, max: 3334}),
      state: chance.pick(['queued', 'running'])
    };
    mockRp.post.withArgs('/queries').returns(Promise.resolve(fakeQueryJob));
    mockRp.get.withArgs(`/queries/${fakeQueryJob.id}`).returns(Promise.resolve(fakeQueryJob));

    fakeQueryJobIds = {};
    ['succeeded', 'cancelled', 'failed', 'queued', 'running', 'unknown'].forEach((state) => {
      let id = chance.integer({min: 1, max: 3333});
      fakeQueryJobIds[state] = {
        state: state,
        id: id
      };
      if (state === 'failed') {
        fakeQueryJobIds[state].exception = new Error(chance.sentence());
      }
      mockRp.get.withArgs(`/queries/${id}`).returns(Promise.resolve(fakeQueryJobIds[state]));
    });

    mockRp.defaults.returnsThis();

    ProxySut = proxyquire('../../lib/civis-client', {
      'request-promise' : mockRp
    });

    sut = new ProxySut(fakeApiKey);
  });



  describe('ctr', () => {

    it('requires a config param', () => {
      var fn = function () {
        let sut = new Sut();
      };
      expect(fn).to.throw(/config/i);
    });

    it('requires config.apiKey', () => {
      let config = { notAKey: chance.word() };
      var fn = function () {
        let sut = new Sut(config);
      };
      expect(fn).to.throw(/apiKey must be specified/i);
    });

    it('allows config to be a string and treats as apiKey', () => {
      let key = chance.guid();
      let sut = new Sut(key);
      // if it fails, we'd get an exception
    });

    it('sets request defaults', () => {

      let apiKey = chance.guid();

      let sut = new ProxySut(apiKey);

      expect(mockRp.defaults).to.have.been.calledWith(sinon.match({
        baseUrl: sinon.match.string,
        auth: {
          bearer: sinon.match(apiKey)
        },
        json: true,
        headers: {
          'Version': '1'
        }
      }));

    });

  });

  describe('getDatabaseId', () => {

    it('calls GET /databases only once', (done) => {

      sut.getDatabaseId().then((dbId) => {
        expect(dbId).to.eql(fakeDatabase.id);
        expect(mockRp.get.withArgs('/databases')).to.have.been.calledOnce;

        // the result of the first getDatabaseId call should be cached
        sut.getDatabaseId().then((dbIdAgain) => {
          expect(dbIdAgain).to.eql(fakeDatabase.id);
          expect(mockRp.get).to.have.been.calledOnce;

          done();


        });

      }).catch(done);

    });

  });

  describe('createTemporaryS3Credentials', () => {

    it('calls GET /credentials only once', (done) => {
      sut.createTemporaryS3Credentials().then(() => {
        expect(mockRp.get.withArgs('/credentials')).to.have.been.calledOnce;

        // the result of the first GET /credentials call should be cached
        sut.createTemporaryS3Credentials().then(() => {
          expect(mockRp.get).to.have.been.calledOnce;
          done();
        }).catch(done);
      }).catch(done);
    });

    it('calls GET /credentials with type filter', (done) => {
      sut.createTemporaryS3Credentials().then(() => {
        expect(mockRp.get.withArgs('/credentials')).to.have.been.calledWith(
          sinon.match.string,
          sinon.match({
            qs: {
              type: sinon.match('Amazon Web Services S3')
            }
          })
        );

        done();
      }).catch(done);

    });

    it('should send duration', (done) => {
      let someDuration = chance.integer({min: 5, max: 444});
      sut.createTemporaryS3Credentials(someDuration).then(() => {
        expect(mockRp.post).to.have.been.calledWith(sinon.match.string, sinon.match({
          body: {
            duration: sinon.match(someDuration)
          }
        }));
        done();
      }).catch(done);
    });

    it('should return an AwsCredential', (done) => {
      sut.createTemporaryS3Credentials().then((cred) => {
        expect(cred).to.be.an.instanceOf(require('../../lib/aws-credential'));
        expect(cred.redshiftCredentialString).to.have.string(fakeTempCredential.accessKey);
        done();
      }).catch(done);
    });

  });

  describe('createQueryJob', () => {

    it('calls POST /queries', (done) => {
      let sql = chance.sentence();
      let previewRows = chance.integer({min: 1, max: 10});

      sut.createQueryJob(sql, previewRows).then((jobId) => {
        expect(jobId).to.eql(fakeQueryJob.id);
        expect(mockRp.post.withArgs('/queries')).to.have.been.calledWith(
          '/queries',
          sinon.match({
            body: {
              database: sinon.match(fakeDatabase.id),
              previewRows: sinon.match(previewRows),
              sql: sinon.match(sql)
            }
          }));

        done();
      }).catch(done);

    });

  });

  describe('getQueryJob', () => {

    it('should call GET /queries', (done) => {

      sut.getQueryJob(fakeQueryJob.id).then((qj) => {
        expect(qj.id).to.eql(fakeQueryJob.id);
        expect(mockRp.get).to.have.been.calledWith(`/queries/${fakeQueryJob.id}`);
        done();
      });

    });

  });

  describe('delayUntilQueryCompletion', () => {

    it('should call GET /queries once for completed query', (done) => {
      sut.delayUntilQueryCompletion(fakeQueryJobIds.succeeded.id).then((qj) => {
        expect(mockRp.get.withArgs(`/queries/${fakeQueryJobIds.succeeded.id}`)).to.have.been.calledOnce;
        done();
      });
    });

    it('should throw Error if cancelled', (done) => {
      sut.delayUntilQueryCompletion(fakeQueryJobIds.cancelled.id).then((qj) => {
        done(new Error('should have thrown'));
      }).catch((err) => {
        expect(err.message).to.contain('Query was inadvertently cancelled');
        done();
      })
    });

    it('should throw Error if failed', (done) => {
      sut.delayUntilQueryCompletion(fakeQueryJobIds.failed.id).then((qj) => {
        done(new Error('should have thrown'));
      }).catch((err) => {
        expect(err.message).to.contain('Exception');
        expect(err.message).to.contain(fakeQueryJobIds.failed.exception.message);
        done();
      })
    });

    it('should throw Error if unrecognized state', (done) => {
      sut.delayUntilQueryCompletion(fakeQueryJobIds.unknown.id).then((qj) => {
        done(new Error('should have thrown'));
      }).catch((err) => {
        expect(err.message).to.eql(
          `Unrecognized query state: ${fakeQueryJobIds.unknown.state}`
        );
        done();
      });
    });

    ['queued', 'running'].forEach((state) => {

      it(`should delay and re-call getQueryJob when ${state}`, (done) => {

        let success = _.clone(fakeQueryJobIds[state]);
        success.state = 'succeeded';

        mockRp.get.withArgs(`/queries/${fakeQueryJobIds[state].id}`)
          .onCall(0).returns(Promise.resolve(fakeQueryJobIds[state]));
        mockRp.get.withArgs(`/queries/${fakeQueryJobIds[state].id}`)
          .onCall(1).returns(Promise.resolve(success));

        sut.delayUntilQueryCompletion(fakeQueryJobIds[state].id, 1).then((qj) => {
          expect(qj.state).to.eql('succeeded');
          expect(qj.id).to.eql(fakeQueryJobIds[state].id);
          expect(mockRp.get.withArgs(`/queries/${fakeQueryJobIds[state].id}`))
            .to.have.been.calledTwice;
          done();
        })

      });

    });

  });

});
