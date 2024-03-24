# S3-Static-Sites

S3-Static-Sites is a Node.js application designed to serve multiple static websites from a single Amazon S3 bucket with a NodeJS proxy. Leveraging the power of Greenlock Express, it automatically manages SSL certificates for all hosted sites, ensuring secure, encrypted connections without the hassle of manual SSL certificate management. It also avoids additional AWS services beyond a small ec2 instance for creating multiple static sites.

> Built with [Greenlock Express](https://git.rootprojects.org/root/greenlock.js) (a [Root](https://rootprojects.org) project).

## Features

- **Multi-Site Hosting**: Host and manage multiple static sites from a single S3 bucket.
- **Automatic SSL**: Utilizes Greenlock Express to automatically issue and renew SSL certificates for each site.
- **Easy Configuration**: Simple `config.json` setup for site management.
- **Easily Add Sites**: Change your config.json and hit the refreshUrl for an instant update to the server.

## Pre-requisites

Start with setting up the following:
1. An s3 bucket
    - With folders for each site you want to host (example.com/, mysite.com/, etc...). Put the sites static files into the directory.
3. An ec2 instance with node installed.
4. Your domain(s) registered in Route53 (or elsewhere) with access to the DNS records.


## Usage

1. **Set up config.json in Bucket**
    - In the root of the bucket, add a config.json file that looks like this:
      ```json
      {
        "maintainerEmail": "your_email@example.com",
        "refreshUrl": "/refresh",
        "sites": [
            {
                "subject": "example.com", 
                "altnames": ["example.com", "www.example.com"]
            },
            // Other sites here...
        ]
      }

2. **Install the server**
    - Connect to your EC2 instance via SSH.
    - run
```npx s3-static-sites-script my-bucket-region my-bucket-name```
    - cd into the newly created folder, and run:
```pm2 start ecosystem.config.js```

3. **Point your DNS records** to the public IP address of the server (add your A records).


## How it Works
It's all pretty simple. When you run the npx script, the repo is copied and the bucket name and region are set as environment variables in ecosystem.config.js. When you run pm2, the server starts by pulling the config.js from the region:bucket supplied in the npx script (you can always modify it later if needed). The config.json tells the server what are legitimate hosts to receive requests for, so make sure that the altnames cover all expected hosts. When a request is received from a domain for the first time, it will prepare a certificate request for that domain using greenlock-express/let's encrypt. Once it passes the greenlock-express server, the rest of the app takes over. It will take the host of the request and look in that s3 directory for files. It will mostly work like basic routing on a static site, looking for index.html files when only a directory is supplied. If you need to change something in your config.json, upload the new file and hit the old refresh url on any domain (default "/refresh").

## Contributing

I put this together for my own purposes and thought it was a neat and useful little app. If you have requests or issues, submit them as issues and I'll see if I have time to help. If you have a nice little contribution, I'll try to get to responding to those as well.

## License

[MIT License](LICENSE)

## Contact

For questions or feedback, please submit an issue.


