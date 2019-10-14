const fs = require("fs"),
  path = require("path"),
  configObj = require(path.join(__dirname, "../config")),
  configLoader = require("./utils/config-loader"),
  app = require("./app"),
  sqlite = require("sqlite"),
  CronJob = require("cron").CronJob,
  { SETUP_SQL } = require("./database"),
  getScraperRunner = require("./utils/scraperRunner");

(async () => {
  const config = await configLoader(configObj);

  const dbPath = path.resolve(__dirname, "../", config.database);
  const pathToDatabase = path.dirname(dbPath);
  if (!fs.existsSync(pathToDatabase)) {
    fs.mkdirSync(pathToDatabase, { recursive: true });
  }

  const db = await sqlite.open(dbPath);
  await db.run(SETUP_SQL);

  const scraperList = [
    "WgGesuchtScraper",
    "StudentenWgScraper",
    "ImmoscoutScraper",
    "ImmonetScraper"
  ]
    .map(scraperModuleName => require("../scraper/" + scraperModuleName))
    .map(scraper => new scraper(db, config));

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

  new app(db, scraperList, config);
})();
