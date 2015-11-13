"use strict";

module.exports = class RunnerResult {
  constructor(sourceTable, destinationTable, bucket, prefix, sourcePrefix, destinationPrefix) {
    this._bucket = bucket;
    this._sourceTable = sourceTable;
    this._destinationTable = destinationTable;
    this._prefix = prefix;
    this._sourcePrefix = sourcePrefix || 'input';
    this._destinationPrefix = destinationPrefix || 'output';
    this._awsCredential = null;
    this._queryJobId = null;
    this._rowCount = null;
    this._startTime = new Date();
    this._delimiter = '|';
  }

  get sourceTable() {
    return this._sourceTable;
  }

  get bucket() {
    return this._bucket;
  }

  get sourcePrefix() {
    return this._prefix + '/' + this._sourcePrefix;
  }

  get destinationTable() {
    return this._destinationTable;
  }

  get destinationPrefix() {
    return this._prefix + '/' + this._destinationPrefix;
  }

  set queryJobId(value) {
    this._queryJobId = value;
  }

  get queryJobId() {
    return this._queryJobId;
  }

  set awsCredential(value) {
    this._awsCredential = value;
  }

  get awsCredential() {
    return this._awsCredential;
  }

  set rowCount(value) {
    this._rowCount = value;
  }

  get rowCount() {
    return this._rowCount;
  }

  get startTime() {
    return this._startTime;
  }

  get delimiter() {
    return this._delimiter;
  }

};
