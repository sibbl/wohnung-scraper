var config = require('./config');

var scraper = [
  require('./scraper/WgGesuchtScraper')
];

var scrape = () => {
  console.log("scrape...");
  scraper.forEach(s => {
    new s().scrape();
  });
}
scrape();
setInterval(scrape, config.frequency);