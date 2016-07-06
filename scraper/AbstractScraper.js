var config = require('../config'),
    q = require('q'),
    geocoder = require('geocoder'),
    moment = require('moment');

module.exports = class AbstractScraper {
  constructor(db, scraperId) {
    if (typeof(scraperId) === "undefined") {
      throw new TypeError("Constructor of scraper needs a ID.");
    }
    if (typeof(this.scrapeSite) !== "function") {
      throw new TypeError("Scraper must override method scrapeSite.");
    }
    if (typeof(this.scrapeItemDetails) !== "function") {
      throw new TypeError("Scraper must override method scrapeItemDetails.");
    }

    this.db = db;
    this.id = scraperId;
    this.config = config.scraper[this.id];

    if(typeof(this.config) === "undefined") {
      console.error("Scraper " + scraperId + " config could not be loaded.");
    }

    this.statements = {
      insert: db.prepare('INSERT INTO "wohnungen" (website, websiteId, url, latitude, longitude, rooms, size, price, free_from, active, gone, data) VALUES ($website, $websiteId, $url, $latitude, $longitude, $rooms, $size, $price, $free_from, $active, $gone, $data)'),
      update: db.prepare('UPDATE "wohnungen" SET url = $url, latitude = $latitude, longitude = $longitude, rooms = $rooms, size = $size, price = $price, free_from = $free_from, active = $active, gone = $gone, data = $data, website = $website, websiteId = $websiteId, removed = $removed, comment = $comment, favorite = $favorite WHERE id = $id'),
      hasId: db.prepare('SELECT COUNT(*) AS count FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId'),
      delete: db.prepare('DELETE FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId'),
      getActiveItems: db.prepare('SELECT * FROM "wohnungen" WHERE website = $website AND gone = 0'),
    };
  }
  insertIntoDb(row) {
    var defer = q.defer();
    this.statements.insert.run({
        $website: this.id,
        $websiteId: row.websiteId,
        $latitude: row.latitude,
        $longitude: row.longitude,
        $rooms: row.rooms,
        $size: row.size,
        $price: row.price,
        $free_from: row.free_from,
        $url: row.url,
        $active: row.active,
        $gone: row.gone,
        $data: typeof(row.data) === 'string' ? row.data : JSON.stringify(row.data)
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
        $id: row.id,
        $website: this.id,
        $websiteId: row.websiteId,
        $latitude: row.latitude,
        $longitude: row.longitude,
        $rooms: row.rooms,
        $size: row.size,
        $price: row.price,
        $free_from: row.free_from,
        $url: row.url,
        $active: row.active,
        $gone: row.gone,
        $removed: row.removed == null ? null : moment(row.removed).toISOString(),
        $comment: row.comment,
        $favorite: row.favorite,
        $data: typeof(row.data) === 'string' ? row.data : JSON.stringify(row.data)
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
  getActiveItems(id) {
    var defer = q.defer();
    this.statements.getActiveItems.all({
        $website: this.id
      }, (error, rows) => {
        if(error) {
          console.error("Error while getting all active items from database", this.id, id, error);
          defer.reject();
        }else{
          defer.resolve(rows);
        }
    });
    return defer.promise;
  }


  _updateItemsAsync(rows) {
    const defer = q.defer();
    const promises = [];
    rows.forEach(row => {
      const innerPromise = q.defer();
      promises.push(innerPromise.promise);
      this.scrapeItemDetails(row.url).then(data => {
        row = Object.assign(row, data);
        this.updateInDb(row).then(() => innerPromise.resolve(true));
      });
    });
    q.all(promises).then(defer.resolve);
    return defer.promise;
  }
  _updateItemsSync(rows) {
    let promise = null;
    rows.forEach(row => {
      var step = () => {
        var def = q.defer();
        this.scrapeItemDetails(row.url).then(data => {
          row = Object.assign(row, data);
          this.updateInDb(row).then(() => def.resolve(true));
        });
        return def.promise;
      }
      if(promise == null) {
        promise = step();
      }else{
        promise = promise.then(function() {
          return q.when(step());
        });
      }
    });
    return q.when(promise);
  }
  updateItems() {
    const defer = q.defer();
    this.getActiveItems().then(rows => {
      this._updateItemsSync(rows).then(() => defer.resolve(true));
    });
    return defer.promise;
  }
  
  scrape() {
    const defer = q.defer();
    console.log("Start scraping " + this.id);
    this.scrapeSiteCounter = 1;
    this.scrapeSite(this.config.url).then(() => {
      console.log("Finish scraping " + this.id);
      defer.resolve();
    });
    return defer.promise;
  }
}