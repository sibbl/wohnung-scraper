var config = require('../config'),
    q = require('q'),
    geocoder = require('geocoder');

module.exports = class AbstractScraper {
  constructor(db, scraperId) {
    if (typeof(scraperId) === "undefined") {
      throw new TypeError("Constructor of scraper needs a ID.");
    }
    if (typeof(this.scrape) !== "function") {
      throw new TypeError("Scraper must override method scrape.");
    }

    this.db = db;
    this.id = scraperId;
    this.config = config.scraper[this.id];

    if(typeof(this.config) === "undefined") {
      console.error("Scraper " + scraperId + " config could not be loaded.");
    }

    this.statements = {
      insert: db.prepare('INSERT INTO "wohnungen" (website, websiteId, url, latitude, longitude, rooms, size, price, free_from, active, data) VALUES ($website, $websiteId, $url, $latitude, $longitude, $rooms, $size, $price, $free_from, $active, $data)'),
      update: db.prepare('UPDATE "wohnungen" SET url = $url, latitude = $latitude, longitude = $longitude, rooms = $rooms, size = $size, price = $price, free_from = $free_from, active = $active, data = $data WHERE website = $website AND websiteId = $websiteId'),
      hasId: db.prepare('SELECT COUNT(*) AS count FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId'),
      delete: db.prepare('DELETE FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId'),
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
        $active: row.active,
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
  updateInDb(row) {
    var defer = q.defer();
    this.statements.update.run({
        $website: this.id,
        $websiteId: row.id,
        $latitude: row.latitude,
        $longitude: row.longitude,
        $rooms: row.rooms,
        $size: row.size,
        $price: row.price,
        $free_from: row.free_from,
        $url: row.url,
        $active: row.active,
        $data: JSON.stringify(row.data)
      }, error => {
        if(error) {
          console.error("Error while updating in database", this.id, error);
          defer.reject();
        }else{
          defer.resolve();
        }
    });
    return defer.promise;
  }
  removeFromDb(id) {
    var defer = q.defer();
    this.statements.delete.run({
        $website: this.id,
        $websiteId: id
      }, error => {
        if(error) {
          console.error("Error while deleting from database", this.id, id, error);
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
        console.error("Error while checking existing items", this.id, error);
        defer.reject();
      }else{
        defer.resolve(result.count > 0);
      }
    })
    return defer.promise;
  }
  getLocationOfAddress(address) {
    const defer = q.defer();
    geocoder.geocode(address, function ( err, data ) {
      if(err || !Array.isArray(data.results) || data.results.length == 0) {
        console.error("Failed to geocode address: " + address);
        defer.reject();
      }else{
        const location = data.results[0].geometry.location;
        defer.resolve({
          latitude: location.lat,
          longitude: location.lng
        });
      }      
    }, {key: config.geocoder.apiKey});
    return defer.promise;
  }
}