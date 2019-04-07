const config = require("./config"),
  app = require("./app"),
  sqlite = require("sqlite"),
  CronJob = require("cron").CronJob,
  { SETUP_SQL } = require("./app/database"),
  fs = require("fs"),
  path = require("path"),
  getScraperRunner = require("./utils/scraperRunner");

const pathToDatabase = path.dirname(config.database);
if (!fs.existsSync(pathToDatabase)) {
  fs.mkdirSync(pathToDatabase, { recursive: true });
}

(async () => {
  const db = await sqlite.open(config.database);
  await db.run(SETUP_SQL);

  const scraperList = [
    "WgGesuchtScraper",
    "StudentenWgScraper",
    "ImmoscoutScraper",
    "ImmonetScraper"
  ]
    .map(scraperModuleName => require("./scraper/" + scraperModuleName))
    .map(scraper => new scraper(db));

  await Promise.all(scraperList.map(s => s.init()));

  const startScraperCronjob = (cronTime, scraperFuncName) => {
    const job = new CronJob({
      cronTime,
      onTick: getScraperRunner(scraperList, scraperFuncName),
      start: true,
      timeZone: "Europe/Berlin"
    });
    job.start();
  };

  startScraperCronjob(config.cronTimes.scrape, "scrape");
  startScraperCronjob(config.cronTimes.update, "updateItems");

  // for debugging:
  // getScraperRunner(scraperList)("scrape");
  // getScraperRunner(scraperList)("updateItems");

  new app(db, scraperList);
})();
