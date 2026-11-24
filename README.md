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
      ```
    - **Redirect-only sites:** add a `redirect` to a site to send every request for its altnames elsewhere instead of serving files from S3. The site still gets an SSL certificate, so `https://` requests redirect too.
      ```json
      {
          "subject": "example.com",
          "altnames": ["example.com", "www.example.com"],
          "redirect": {
              "to": "https://www.example.org/landing",
              "status": 301,
              "preservePath": false
          }
      }
      ```
      - `to` (required): an absolute `http(s)://` URL. `"redirect": "https://..."` is shorthand for the defaults below.
      - `status` (optional, default `301`): one of `301`, `302`, `307`, `308`.
      - `preservePath` (optional, default `false`): when `true`, the request path and query string are appended to `to` (`/a?b=1` -> `https://www.example.org/a?b=1`).
      - An invalid `redirect` is logged and ignored rather than stopping the server.
    - **Tip:** anyone who knows `refreshUrl` can restart the server, so set it to a long random path (e.g. `/refresh-3f9c1a...`).

2. **Install the server**
    - Connect to your EC2 instance via SSH.
    - run
```npx s3-static-sites-script my-bucket-region my-bucket-name```
    - cd into the newly created folder, and run:
```pm2 start ecosystem.config.js```

3. **Point your DNS records** to the public IP address of the server (add your A records).


## How it Works
It's all pretty simple. When you run the npx script, the repo is copied and the bucket name and region are set as environment variables in ecosystem.config.js. When you run pm2, the server starts by pulling the config.js from the region:bucket supplied in the npx script (you can always modify it later if needed). The config.json tells the server what are legitimate hosts to receive requests for, so make sure that the altnames cover all expected hosts. When a request is received from a domain for the first time, it will prepare a certificate request for that domain using greenlock-express/let's encrypt. Once it passes the greenlock-express server, the rest of the app takes over. It will take the host of the request and look in that s3 directory for files. It will mostly work like basic routing on a static site, looking for index.html files when only a directory is supplied. If you need to change something in your config.json, upload the new file and hit the old refresh url on any domain (default "/refresh").

## Development
- `npm test` runs the unit tests (Node's built-in test runner). CI runs them on every pull request.
- `npm run dev` starts the app on port 3000 without Greenlock. Set `TEST_HOST` to treat every request as that host.

## Contributing

I put this together for my own purposes and thought it was a neat and useful little app. If you have requests or issues, submit them as issues and I'll see if I have time to help. If you have a nice little contribution, I'll try to get to responding to those as well.

## License

[MIT License](LICENSE)

## Contact

For questions or feedback, please submit an issue.


