"use strict";

const AWS = require('aws-sdk');

const CIVIS_AWS_REGION = 'us-east-1';

function obfuscateString(str) {
  return str ? str.substring(0, str.length / 4) + 'XXXX' : null;
}

module.exports = class AwsCredential {
  constructor(accessKeyId, secretAccessKey, sessionToken) {
    this._accessKeyId = accessKeyId;
    this._secretAccessKey = secretAccessKey;
    this._sessionToken = sessionToken;
  }

  get redshiftCredentialString() {
    let credString = `aws_access_key_id=${this._accessKeyId};aws_secret_access_key=${this._secretAccessKey}`;
    if (this._sessionToken) {
      credString += `;token=${this._sessionToken}`;
    }
    return credString;
  }

  updateAwsSdkCredentials() {
    AWS.config.update({
      accessKeyId: this._accessKeyId,
      secretAccessKey: this._secretAccessKey,
      sessionToken: this._sessionToken,
      region: CIVIS_AWS_REGION,
      logger: process.stdout
    });
  }

  toString() {
    return JSON.stringify({
      accessKeyId : obfuscateString(this._accessKeyId),
      secretAccessKey : obfuscateString(this._secretAccessKey),
      sessionToken : obfuscateString(this._sessionToken)
    });
  }

};
