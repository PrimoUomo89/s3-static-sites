const express = require('express');
const { GetObjectCommand, HeadObjectCommand, S3Client } = require("@aws-sdk/client-s3");

let bucket;
let s3Client;

module.exports = function createApp(hosts, bucketRegion, bucketName, {testHost, refreshUrl= "/refresh"}) {

  s3Client = new S3Client({ region: bucketRegion });

  bucket = bucketName;

  const app = express();

  app.get(refreshUrl, async (req, res) => {
    process.exit();
  })

  app.get('*', async (req, res) => {

    let host = req.hostname;
    if (testHost) {
      host = testHost 
    }

    if (!hosts.includes(host)) {
      console.error(`Unrecognized Host: ${host}`)
      return
    }

    const path = await resolveFinalPath(host, req.path) 
    const key = `${host}${path}`;
    console.log(`${req.ip} == GET: ${key}`)

    try {
      const headResult = await s3Client.send( new HeadObjectCommand({Bucket: bucket, Key: key}))
      const contentType = headResult.ContentType 

      const object = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      let contents = await streamToBuffer(object.Body);

      res.setHeader('Content-Type', contentType)
      res.send(contents);
    } catch (error) {
      console.error(error);
      res.status(404).send('File not found');
    }

  });

  return app

}


async function resolveFinalPath(host, path) {
  // Check if path ends in /
  if (path.endsWith('/')) {
    return path + 'index.html';
  }

  // Check if path has a file extension
  const hasExtension = path.includes('.') && path.split('.').pop().length > 0;

  // If no file extension, decide which file to serve
  if (!hasExtension) {
    const keyWithIndexHtml = `${host}${path}/index.html`;
    const keyWithHtml = `${host}${path}.html`;

    // Try the most likely option first (/index.html)
    if (await fileExists(keyWithIndexHtml)) {
      return path + '/index.html';
    } else if (await fileExists(keyWithHtml)) {
      // If /index.html doesn't exist, check for .html
      return path + '.html';
    }
  }

  // If the path has an extension or doesn't need modification, return it as is
  return path;
}

async function fileExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    return false;
  }
}


// Helper function to convert a stream into a buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}