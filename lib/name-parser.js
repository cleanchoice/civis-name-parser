"use strict";

const Promise = require('bluebird'),
  through = require('through2'),
  pipeParser = require('csv-parser'),
  stringify = require('csv-stringify'),
  nameParser = require('another-name-parser'),
  S3Stream = require('s3-upload-stream'),
  AWS = require('aws-sdk'),
  s3 = new AWS.S3(),
  uploadStream = new S3Stream(s3),
  zlib = require('zlib');

function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve);
    // some streams use alternate event names rather than "end"
    stream.on('success', resolve); // AWS
    stream.on('uploaded', resolve); // s3-upload-stream
    stream.on('error', reject);
  });
}

module.exports = class NameParser {


  static parse(result) {

    let rowCount = 0;

    result.awsCredential.updateAwsSdkCredentials(s3);
    s3.config.setPromisesDependency(Promise);

    return s3.listObjects({
      Bucket: result.bucket + '/',
      Prefix: result.sourcePrefix
    }).promise().then((objects) => {
      return objects.Contents
    }).map((obj) => {
      let key = obj.Key;
      let outputKey = key.replace(result.sourcePrefix, result.destinationPrefix);
      let readStream = s3.getObject({
        Bucket: result.bucket,
        Key: key
      }).createReadStream();


      readStream
        .pipe(zlib.createGunzip())
        .pipe(pipeParser({
          separator: result.delimiter,
          headers: ['id', 'full_name'],
          escape: '\0'
        }))
        .pipe(through.obj(function(chunk, enc, cb) {
          rowCount++;

          var parsedName = nameParser(chunk.full_name);

          this.push({
            query_job_id: result.queryJobId,
            source_id: chunk.id,
            full_name: chunk.full_name,
            title: parsedName.prefix,
            first_name: parsedName.first,
            middle_name: parsedName.middle,
            last_name: parsedName.last,
            suffix: parsedName.suffix
          });

          cb();
        }, (cb) => {
          result.rowCount = rowCount;
          cb();
        }))
        .pipe(stringify({
          header: false,
          quotedEmpty: false,
          quoted: false,
          delimiter: result.delimiter
        }))
        .pipe(zlib.createGzip())
        .pipe(uploadStream.upload({
          Bucket: result.bucket,
          Key: outputKey
        }));

      return streamToPromise(readStream).then(() => {
        return s3.waitFor('objectExists', {
          Bucket: result.bucket,
          Key: outputKey
        }).promise().then((data) => {
          console.log(`${outputKey} should now be loaded to S3`)
        });
      });
    }).then(() => {
      return result;
    });

  }

};
