var config = require('./config'),
    app = require('./app'),
    sqlite = require('sqlite3').verbose(),
    db = new sqlite.Database(config.database);

var scraper = [
  // require('./scraper/WgGesuchtScraper'),
  require('./scraper/StudentWgScraper'),
];

var scrape = () => {
  console.log("scrape...");
  scraper.forEach(s => {
    new s(db).scrape();
  });
}
scrape();
setInterval(scrape, config.frequency);

var appInstance = new app(db);