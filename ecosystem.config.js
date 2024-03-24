module.exports = {
    apps : [{
      name: 'S3-Static-Sites',
      script: 'server.js',
      max_memory_restart: '256M',
      env: {
          NODE_ENV: 'development',
          BUCKET_NAME: '...',
          BUCKET_REGION: '...',
      },
      env_production : {
         NODE_ENV: 'production'
      }
    }]
};
  