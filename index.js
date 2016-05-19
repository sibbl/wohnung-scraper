var config = require('./config');

var scraper = [
  // require('./scraper/WgGesuchtScraper'),
  require('./scraper/StudentWgScraper'),
];

var scrape = () => {
  console.log("scrape...");
  scraper.forEach(s => {
    new s().scrape();
  });
}
scrape();
setInterval(scrape, config.frequency);