"use strict";

const assert = require('assert'),
  Promise = require('bluebird'),
  AwsCredential = require('./aws-credential');

var rp = require('request-promise');

  /**
 * Library of Civis tools
 * @type {CivisClient}
 */
module.exports = class CivisClient {

  /**
   * Create a Civis Client
   * @param {Object} config - a configuration
   * @param {String} config.apiKey - Your Civis API key
   */
  constructor(config) {
    assert.ok(config);
    if (typeof(config) === 'string') {
      config = {
        apiKey: config
      };
    }
    assert.ok(config.apiKey, 'apiKey must be specified');

    rp = rp.defaults({
      baseUrl: 'https://api.civisanalytics.com/',
      auth: {
        bearer: config.apiKey
      },
      json: true,
      headers: {
        'Version' : '1'
      }
    });

    this.databaseId = null;
    this.s3CredentialId = null;
  }


  /**
   * Retrieve your Redshift database's ID
   * @returns {Promise.<integer, Error>}
   */
  getDatabaseId() {
    var self = this;
    return Promise.resolve(self.databaseId).then(function (dbId) {
      if (dbId) {
        return dbId;
      } else {
        return rp.get('/databases').then(function (databases) {
            // TODO: allow database name to be specified per Sean's example
            return databases[0].id;
          })
          .then(function (databaseId) {
            self.databaseId = databaseId;
            return databaseId;
          });
      }
    });
  }

  /**
   * Creates temporary S3 credentials used for UNLOAD and COPY statements
   * @param {integer} [3600] duration - lifespan of temporary credentials (in seconds)
   * @returns {Promise.<Object, Error>} an S3 credential
   */
  createTemporaryS3Credentials(duration) {
    duration = duration || 60 * 60 * 1; // 1 hour
    var self = this;
    return Promise.resolve(self.s3CredentialId).then(function (s3Id) {
      if (s3Id) {
        return s3Id;
      } else {
        return rp.get('/credentials', {qs: {
          type: 'Amazon Web Services S3'
        }}).then(function (credentials) {
            if (!credentials) {
              throw new Error('No AWS S3 credentials have been loaded to Civis');
            }
            return credentials[0].id;
          })
          .then(function (s3CredId) {
            self.s3CredentialId = s3CredId;
            return s3CredId;
          });
      }

    }).then(function (s3Id) {
      return rp.post(`/credentials/${s3Id}/temporary`, { body: {
        duration: duration
      }}).then(function (tempCred) {
        return new AwsCredential(tempCred.accessKey, tempCred.secretAccessKey, tempCred.sessionToken);
      });
    });
  };

  /**
   * Creates a query in Civis
   * @param {String} sql
   * @param {integer} [1] previewRows
   * @returns {Promise.<integer, Error>}
   */
  createQueryJob(sql, previewRows) {
    var self = this;
    previewRows = previewRows || 1;
    return this.getDatabaseId().then(function (dbId) {
      return rp.post('/queries', { body: {
        database: dbId,
        previewRows: previewRows,
        sql: sql
      }}).then(function (queryJob) {
        return queryJob.id;
      });
    });
  };

  /**
   * Retrieves the given Query Job by ID
   * @param {integer} queryJobId
   * @returns {Promise.<Object, Error>} the query job object
   */
  getQueryJob(queryJobId) {
    return rp.get(`/queries/${queryJobId}`);
  };

  delayUntilQueryCompletion(queryJobId, delayInSeconds) {
    var self = this;
    delayInSeconds = delayInSeconds || (5 * 1000);
    return this.getQueryJob(queryJobId).then((queryInfo) => {
      return this._delayUntilQueryCompletion(queryInfo, delayInSeconds);
    });
  };

  _delayUntilQueryCompletion(queryInfo, delayInSeconds) {

    switch (queryInfo.state) {
      case 'succeeded':
        return queryInfo;
      case 'cancelled':
        throw new Error(`Query was inadvertently cancelled: ${JSON.stringify(queryInfo)}`);
      case 'failed':
        throw new Error(`Exception: ${queryInfo.exception}
        Query: ${queryInfo.sql}`);
      case 'queued':
      case 'running':
        console.log(`Query is not finished, delaying ${delayInSeconds} ms ...`);
        return Promise.delay(delayInSeconds).bind(this).then(() => {
          console.log(`...and trying again...`);
          return this.getQueryJob(queryInfo.id).then((queryInfo) => {
            return this._delayUntilQueryCompletion(queryInfo, delayInSeconds);
          });
        });
      default:
        throw new Error(`Unrecognized query state: ${queryInfo.state}`);
    }
  };

};
