"use strict";

const chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  chance = new (require('chance')).Chance(),
  Sut = require('../../lib/aws-credential');

//chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('aws-credential', () => {

  var accessId,
    secretKey,
    sessionToken;

  beforeEach(() => {
    accessId = chance.bb_pin();
    secretKey = chance.guid();
    sessionToken = chance.hash();
  });

  describe('redshiftCredentialString', () => {
    it('formats redshift credentials (w/ token)', () => {

      let sut = new Sut(accessId, secretKey, sessionToken);

      expect(sut.redshiftCredentialString).to.have.string(
        `aws_access_key_id=${accessId};aws_secret_access_key=${secretKey};token=${sessionToken}`
        , 'should contain access ID, secret key, and session token');

    });

    it('formats redshift credentials (w/o token)', () => {

      let sut = new Sut(accessId, secretKey);

      expect(sut.redshiftCredentialString).to.have.string(
        `aws_access_key_id=${accessId};aws_secret_access_key=${secretKey}`
        , 'should contain access ID and secret key');

      expect(sut.redshiftCredentialString)
        .to.not.match(/token=/i, 'no token was provided, so do not return it');

    });

  });

  describe('updateAwsSdkCredentials', () => {

    it('updates the AWS config', () => {
      let mockAws = {
        config: sinon.stub({
          update: function () {
          }
        })
      };

      let awsOpts = {
        accessKeyId: accessId,
        secretAccessKey: secretKey,
        sessionToken: sessionToken,
        region: sinon.match.string
      };

      let sut = new Sut(accessId, secretKey, sessionToken);

      sut.updateAwsSdkCredentials(mockAws);
      expect(mockAws.config.update).to.have.been.calledWith(awsOpts);


    });

  });

  describe('toString', () => {

    it('obfuscates values', () => {
      let sut = new Sut(accessId, secretKey, sessionToken);

      let s = sut.toString();

      expect(s).to.not.have.string(accessId);
      expect(s).to.not.have.string(secretKey);
      expect(s).to.not.have.string(sessionToken);

      expect(s).to.have.string('accessKeyId');
      expect(s).to.have.string('secretAccessKey');
      expect(s).to.have.string('sessionToken');


    });

  });

});
