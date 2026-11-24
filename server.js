"use strict";
 
const createApp = require("./app.js");
const {BUCKET_NAME, TEST_HOST, BUCKET_REGION} = process.env;
const { getConfig, updateLocalSites, ensureGreenlockFilesExist } = require("./helpers/config.js");
const { buildRedirectMap, toGreenlockSites } = require("./helpers/redirects.js");

( async () => {

    let config = await getConfig(BUCKET_REGION, BUCKET_NAME)

    console.log("SiteList from S3: ", config.sites, "\n")

    let hosts = []
    config.sites.forEach((s) => {
        hosts.push(...s.altnames)
    })

    const testMode = process.argv.includes("--test");

    const redirects = buildRedirectMap(config.sites)
    redirects.forEach((r, host) => console.log(`Redirect: ${host} -> ${r.to} (${r.status})`))

    const app = createApp(hosts, BUCKET_REGION, BUCKET_NAME, {
        testHost: testMode && TEST_HOST ? TEST_HOST : undefined,
        refreshUrl: config.refreshUrl,
        redirects
    })

    if (testMode) {
    
        if (TEST_HOST && testMode) {
            console.log(`Treating all requests as test host: ${TEST_HOST}\n`)
        }

        app.listen(3000, () => {
            console.log("Listening on 3000")
        })

    } else {

        ensureGreenlockFilesExist(config);

        updateLocalSites(toGreenlockSites(config.sites))

        require("greenlock-express")
            .init({
                packageRoot: __dirname,
                configDir: "./greenlock.d",
                maintainerEmail: config.maintainerEmail,
                cluster: false
            })
            .serve(app);

    }

})() 
