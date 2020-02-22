process.env.NTBA_FIX_319 = 1;

const fs = require("fs"),
  path = require("path"),
  configLoader = require("./utils/config-loader"),
  app = require("./app"),
  sqlite = require("sqlite"),
  CronJob = require("cron").CronJob,
  getScraperRunner = require("./utils/scraperRunner"),
  DBMigrate = require("db-migrate");

let configObj;
try {
  configObj = require(path.join(__dirname, "../config"));
} catch (e) {
  console.error(
    "Could not start because no config.js was found. See the README for more information."
  );
  if (process.env.IS_DOCKER) {
    console.error(
      "Please mount your local_config.js to /app/config.js in Docker using -v ~/local_config.js:/app/config.js.\nYou may also want to mount -v ~/data:/app/data."
    );
  }
  process.exit();
}

(async () => {
  const config = await configLoader(configObj);

  const dbPath = path.resolve(__dirname, "../", config.database);
  const pathToDatabase = path.dirname(dbPath);
  if (!fs.existsSync(pathToDatabase)) {
    fs.mkdirSync(pathToDatabase, { recursive: true });
  }

  const dbm = DBMigrate.getInstance(true);
  await dbm.up();

  const db = await sqlite.open(dbPath);

  const allScrapers = await Promise.all(
    [
      "WgGesuchtScraper",
      "StudentenWgScraper",
      "ImmoscoutScraper",
      "ImmonetScraper"
    ]
      .map(scraperModuleName => require("../scraper/" + scraperModuleName))
      .map(scraper => new scraper(db, config))
      .map(scraper => scraper.init())
  );

  const scraperList = allScrapers.filter(loadedScraper => loadedScraper);

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
