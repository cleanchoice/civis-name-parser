"use strict";

const Promise = require('bluebird');

module.exports = (stream) => {
  return new Promise((resolve, reject) => {
    stream.on('end', resolve);
    // some streams use alternate event names rather than "end"
    stream.on('success', resolve); // AWS
    stream.on('uploaded', resolve); // s3-upload-stream
    stream.on('error', reject);
  });
};