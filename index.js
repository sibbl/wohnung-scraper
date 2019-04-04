const config = require('./config'),
  app = require('./app'),
  sqlite = require('sqlite3').verbose(),
  CronJob = require('cron').CronJob,
  q = require('q'),
  { SETUP_SQL } = require('./app/database'),
  fs = require('fs'),
  path = require('path');

const pathToDatabase = path.dirname(config.database);
if (!fs.existsSync(pathToDatabase)) {
  fs.mkdirSync(pathToDatabase, { recursive: true });
}

const db = new sqlite.Database(config.database);
db.run(SETUP_SQL, () => {
  const scraper = [
    'WgGesuchtScraper',
    'StudentenWgScraper',
    'ImmoscoutScraper',
    'ImmonetScraper'
  ].map(scraper => {
    const s = require('./scraper/' + scraper);
    return new s(db);
  });

  const startScraperCronjob = function (cronTime, scraperFuncName) {
    const job = new CronJob({
      cronTime: cronTime,
      onTick: function () {
        console.log("Run cron: " + scraperFuncName + "(" + (new Date().toISOString()) + ")");
        let promise = null;
        scraper.forEach(s => {
          if (promise == null) {
            promise = s[scraperFuncName]();
          } else {
            promise = promise.then(function () {
              return q.when(s[scraperFuncName]());
            });
          }
        });
        // scraper.forEach(s => s[scraperFuncName]());
      },
      start: true,
      timeZone: 'Europe/Berlin'
    });
    job.start();
  }

  startScraperCronjob(config.cronTimes.scrape, "scrape");
  startScraperCronjob(config.cronTimes.update, "updateItems");

  new app(db, scraper);
});