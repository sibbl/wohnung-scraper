var config = require('../config'),
    sqlite = require('sqlite3').verbose(),
    db = new sqlite.Database(config.database),
    q = require('q');

module.exports = class AbstractScraper {
  constructor(scraperId) {
    if (typeof(scraperId) === "undefined") {
      throw new TypeError("Constructor of scraper needs a ID.");
    }
    if (typeof(this.scrape) !== "function") {
      throw new TypeError("Scraper must override method scrape.");
    }

    this.id = scraperId;
    this.config = config.scraper[this.id];

    if(typeof(this.config) === "undefined") {
      console.error("Scraper " + scraperId + " config could not be loaded.");
    }

    this.statements = {
      insert: db.prepare('INSERT INTO "wohnungen" (website, websiteId, url, latitude, longitude, rooms, size, price, free_from, data) VALUES ($website, $websiteId, $url, $latitude, $longitude, $rooms, $size, $price, $free_from, $data)'),
      hasId: db.prepare('SELECT COUNT(*) AS count FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId')
    };
  }
  insertIntoDb(row) {
    var defer = q.defer();
    this.statements.insert.run({
        $website: this.id,
        $websiteId: row.id,
        $latitude: row.latitude,
        $longitude: row.longitude,
        $rooms: row.rooms,
        $size: row.size,
        $price: row.price,
        $free_from: row.free_from,
        $url: row.url,
        $data: JSON.stringify(row.data)
      }, error => {
        if(error) {
          console.error("Error while inserting into database", this.id, error);
          defer.reject();
        }else{
          defer.resolve();
        }
    });
    return defer.promise;
  }
  hasItemInDb(id) {
    var defer = q.defer();
    this.statements.hasId.get({
      $website: this.id,
      $websiteId: id
    }, (error, result) => {
      if(error) {
        console.error("Error while cehcking existing items", this.id, error);
        defer.reject();
      }else{
        defer.resolve(result.count > 0);
      }
    })
    return defer.promise;
  }
}