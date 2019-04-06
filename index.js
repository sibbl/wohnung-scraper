const config = require("./config"),
    app = require("./app"),
    sqlite = require("sqlite"),
    CronJob = require("cron").CronJob,
    { SETUP_SQL } = require("./app/database"),
    fs = require("fs"),
    path = require("path");

const pathToDatabase = path.dirname(config.database);
if (!fs.existsSync(pathToDatabase)) {
    fs.mkdirSync(pathToDatabase, { recursive: true });
}

(async () => {
    const db = await sqlite.open(config.database);
    await db.run(SETUP_SQL);
    const scraper = [
        "WgGesuchtScraper",
        "StudentenWgScraper",
        "ImmoscoutScraper",
        "ImmonetScraper"
    ].map(scraperModuleName => {
        const scraper = require("./scraper/" + scraperModuleName);
        return new scraper(db);
    });

    const getRunFunction = scraperFuncName => async () => {
        console.log(
            "Run cron: " +
                scraperFuncName +
                "(" +
                new Date().toISOString() +
                ")"
        );
        for(let s of scraper) {
          await s[scraperFuncName]();
        }
    };

    const startScraperCronjob = (cronTime, scraperFuncName) => {
        const job = new CronJob({
            cronTime,
            onTick: getRunFunction(scraperFuncName),
            start: true,
            timeZone: "Europe/Berlin"
        });
        job.start();
    };

    startScraperCronjob(config.cronTimes.scrape, "scrape");
    startScraperCronjob(config.cronTimes.update, "updateItems");

    // for debugging:
    // getRunFunction("scrape")();
    // getRunFunction("updateItems")();

    new app(db, scraper);
})();
