const config = require("../config"),
  app = require("./app"),
  sqlite = require("sqlite"),
  CronJob = require("cron").CronJob,
  { SETUP_SQL } = require("./database"),
  fs = require("fs"),
  path = require("path"),
  getScraperRunner = require("./utils/scraperRunner");

const dbPath = path.resolve("../", config.database);  
const pathToDatabase = path.dirname(dbPath);
if (!fs.existsSync(pathToDatabase)) {
  fs.mkdirSync(pathToDatabase, { recursive: true });
}

(async () => {
  const db = await sqlite.open(dbPath);
  await db.run(SETUP_SQL);

  const scraperList = [
    "WgGesuchtScraper",
    "StudentenWgScraper",
    "ImmoscoutScraper",
    "ImmonetScraper"
  ]
    .map(scraperModuleName => require("../scraper/" + scraperModuleName))
    .map(scraper => new scraper(db));

  await Promise.all(scraperList.map(s => s.init()));

  const scraperRunner = getScraperRunner(scraperList);

  const startScraperCronjob = (cronTime, scraperFuncName) => {
    const job = new CronJob({
      cronTime,
      onTick: () => scraperRunner(scraperFuncName)
    });
    job.start();
  };

  startScraperCronjob(config.cronTimes.scrape, "scrape");
  startScraperCronjob(config.cronTimes.update, "updateItems");

  new app(db, scraperList);
})();
