var config = require('./config'),
    app = require('./app'),
    sqlite = require('sqlite3').verbose(),
    db = new sqlite.Database(config.database),
    CronJob = require('cron').CronJob;

const scraper = [
  'WgGesuchtScraper',
  'StudentenWgScraper',
].map(scraper => {
  const s = require('./scraper/' + scraper);
  return new s(db);
});

var job = new CronJob({
  cronTime: config.cronTime,
  onTick: function() {
    scraper.forEach(s => s.scrape());
  },
  start: true,
  timeZone: 'Europe/Berlin'
});
job.start();

var appInstance = new app(db, scraper);