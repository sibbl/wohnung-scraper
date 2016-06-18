var config = require('./config'),
    app = require('./app'),
    sqlite = require('sqlite3').verbose(),
    db = new sqlite.Database(config.database),
    CronJob = require('cron').CronJob;

const scraper = [
  'WgGesuchtScraper',
  'StudentenWgScraper',
  'ImmoscoutScraper',
].map(scraper => {
  const s = require('./scraper/' + scraper);
  return new s(db);
});

const startScraperCronjob = function(cronTime, scraperFuncName) {
  const job = new CronJob({
    cronTime: cronTime,
    onTick: function() {
      scraper.forEach(s => s[scraperFuncName]());
    },
    start: true,
    timeZone: 'Europe/Berlin'
  });
  job.start();
}

startScraperCronjob(config.cronTimes.scrape, "scrape");
startScraperCronjob(config.cronTimes.update, "updateItems");

new app(db, scraper);