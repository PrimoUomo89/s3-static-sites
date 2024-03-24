"use strict";
 
const createApp = require("./app.js");
const {BUCKET_NAME, TEST_HOST, BUCKET_REGION} = process.env;
const { getConfig, updateLocalSites, ensureGreenlockFilesExist } = require("./helpers/config.js");

( async () => {

    let config = await getConfig(BUCKET_REGION, BUCKET_NAME)

    console.log("SiteList from S3: ", config.sites, "\n")

    let hosts = []
    config.sites.forEach((s) => {
        hosts.push(...s.altnames)
    })

    const testMode = process.argv.includes("--test");

    const app = require("./app.js")(hosts, BUCKET_REGION, BUCKET_NAME, {
        TEST_HOST: testMode && TEST_HOST ? TEST_HOST : undefined,
        refreshUrl: config.refreshUrl
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

        updateLocalSites(config.sites)

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
