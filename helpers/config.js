const fs = require('fs');
const path = require('path');


const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");


async function getConfig(bucketRegion, bucketName) {
  
  const s3Client = new S3Client({ region: bucketRegion });

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: "config.json",
    });

    const { Body } = await s3Client.send(command);

    const streamToString = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      });

    const resultString = await streamToString(Body);
    const config = JSON.parse(resultString);

    return config;

  } catch (error) {
    throw new Error(`Failed to load configuration from S3: ${error.message}`);
  }

}


function updateLocalSites(siteList) {
  const configPath = path.join(__dirname, '..', 'greenlock.d', 'config.json');
  let glConfig = require(configPath);
    
  glConfig.sites = siteList;
    
  fs.writeFileSync(configPath, JSON.stringify(glConfig, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Failed to update config.json:', err);
      return;
    }
    console.log('config.json has been updated successfully.');
  });
};





function ensureGreenlockFilesExist(config) {
  const greenlockRCPath = './.greenlockrc';
  const greenlockConfigPath = './greenlock.d/config.json';

  // Check and create .greenlockrc if it doesn't exist
  if (!fs.existsSync(greenlockRCPath)) {
    const greenlockRCContent = {
      manager: { module: "@greenlock/manager" },
      configDir: "./greenlock.d"
    };
    fs.writeFileSync(greenlockRCPath, JSON.stringify(greenlockRCContent, null, 2));
    console.log('.greenlockrc has been created');
  }

  // Ensure the greenlock.d directory exists
  fs.mkdirSync(path.dirname(greenlockConfigPath), { recursive: true });

  // Check and create greenlock.d/config.json if it doesn't exist
  if (!fs.existsSync(greenlockConfigPath)) {
    const greenlockConfigContent = {
      defaults: { subscriberEmail: config.maintainerEmail },
      sites: []
    };
    fs.writeFileSync(greenlockConfigPath, JSON.stringify(greenlockConfigContent, null, 2));
    console.log('greenlock.d/config.json has been created');
  }
}




module.exports = {
  getConfig,
  updateLocalSites,
  ensureGreenlockFilesExist
}
