"use strict";

const assert = require('assert'),
  moment = require('moment'),
  RunnerResult = require('./runner-result'),
  Table = require('./table'),
  SourceTable = require('./source-table'),
  NameParser = require('./name-parser');

module.exports = class Runner {
  constructor(civisClient) {
    this.civis = civisClient;
  }

  static _getUnloadSql(result) {
    return `UNLOAD('
  SELECT
    "${result.sourceTable.primaryKeyColumn}" AS id,
    REPLACE("${result.sourceTable.nameColumn}", \\'${result.delimiter}\\', \\' \\') AS full_name
  FROM "${result.sourceTable.schema}"."${result.sourceTable.name}"
')
TO 's3://${result.bucket}/${result.sourcePrefix}'
WITH CREDENTIALS '${result.awsCredential.redshiftCredentialString}'
DELIMITER '${result.delimiter}'
GZIP;`;
  }

  static _getCopySql(result) {
    return `COPY ${result.destinationTable} (
    query_job_id,
    source_id,
    full_name,
    title,
    first_name,
    middle_name,
    last_name,
    suffix
)
FROM 's3://${result.bucket}/${result.destinationPrefix}'
WITH CREDENTIALS '${result.awsCredential.redshiftCredentialString}'
DELIMITER '${result.delimiter}'
TRUNCATECOLUMNS
GZIP
EMPTYASNULL;`
  }


  _unloadData(result) {
    let self = this;
    return self.civis.createQueryJob(Runner._getUnloadSql(result)).bind(this)
      .then((queryId) => {
        result.queryJobId = queryId;
        return self.civis.delayUntilQueryCompletion(queryId);
      }).then(() => {
        return result;
      });
  }

  _copyData(result) {
    let self = this;
    //return result;
    return self.civis.createQueryJob(Runner._getCopySql(result)).bind(this)
      .then((queryId) => {
        console.log(`copydata queryJob ${queryId} created`);
        return self.civis.delayUntilQueryCompletion(queryId);
      }).then(() => {
        return result;
      });

  }

  run(tableName, idColumn, nameColumn, bucketName, destination) {
    assert.ok(bucketName, 'bucketName is required');
    assert.ok(tableName, 'tableName is required');
    assert.ok(idColumn, 'idColumn is required');
    assert.ok(nameColumn, 'nameColumn is required');

    let bucketKey = moment().format('YYYYMMDD-HHmmss');
    let sourceTable = SourceTable.createFromInput(tableName, idColumn, nameColumn);
    let destinationTable = destination ?
      Table.createFromInput(destination) :
      new Table(sourceTable.schema, 'parsed_names');

    let result = new RunnerResult(
      sourceTable,
      destinationTable,
      bucketName,
      `parsed-names/${bucketKey}`
    );

    return this.civis.createTemporaryS3Credentials().then((creds) => {
      result.awsCredential = creds;
      return result;
    }).then(this._unloadData.bind(this))
      .then((result) => {
        console.log('unloading done, move on to parsing');
        return NameParser.parse(result);
      })
      .then((result) => {
        console.log('parsing done, move on to copying');
        return result;
      })
      .then(this._copyData.bind(this));
  }

};
