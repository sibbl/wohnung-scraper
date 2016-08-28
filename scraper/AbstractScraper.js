var config = require('../config'),
    q = require('q'),
    NodeGeocoder = require('node-geocoder'),
    moment = require('moment'),
    TelegramBot = require('node-telegram-bot-api'),
    geolib = require('geolib');

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
      }, function(error) {
        if(error) {
          console.error("Error while inserting into database", this.id, error);
          defer.reject();
        }else{
          defer.resolve(this.lastID);
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
    const strippedAddress = address.replace(/ *\([^)]*\) */g, "");
    if(strippedAddress.length == 0) {
      defer.reject();
    }else{
      var geocoder = NodeGeocoder(config.geocoder);
      geocoder.geocode(strippedAddress, function ( err, res ) {
        if(err || !Array.isArray(res) || res.length < 1) {
          console.error("Failed to geocode address: '" + strippedAddress + "' (original: '" + address + "')", err, res);
          defer.reject();
        }else{
          defer.resolve({
            latitude: res[0].latitude,
            longitude: res[0].longitude
          });
        }      
      });
    }
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

  sendBotNotifications(bots, result) {
    // use only added flats
    var flatsOfInterest = result.filter(flat => {
      if(flat.type != "added") {
        return false;
      }
      var filters = config.filters.default;
      if(flat.price < filters.price.min || flat.price > filters.price.max) {
        return false;
      }
      if(flat.rooms < filters.rooms.min || flat.rooms > filters.rooms.max) {
        return false;
      }
      if(flat.size < filters.size.min || flat.size > filters.size.max) {
        return false;
      }
      var free_from = [null];
      var start = moment().startOf("month").startOf("day").subtract(1,'day'); //use last day of last month 
      var startIsMonthBegin = true;
      var now = moment().startOf("day");
      if(start.isBefore(now)) { //if start is before now (e.g. 30th of last month is before 5th)
        start = start.add(14, 'days'); //then try 14th of current month
        startIsMonthBegin = false;
        if(start.isBefore(now)) { //if it's still before now (e.g. 14th is before 20th)
          //add one month to last date
          start = moment().startOf("month").startOf("day").add(1, "month").subtract(1,'day');
          startIsMonthBegin = true;
        }
      }
      //generate 8 values (next 4 months)
      for(var i = startIsMonthBegin ? 0 : 1; i < 8; i++) {
        if(i % 2 == 1) {
          //middle of month
          free_from.push(start.clone());
          start = start.add(1, "month").startOf("month").startOf("day").subtract(1,'day'); //last day of month
        }else{
          //start of month
          free_from.push(start.clone());
          start = start.add(14, "days"); //14th of current month
        }
      }

      var minFreeFrom = free_from[filters.free_from.min];
      var maxFreeFrom = free_from[filters.free_from.max];
      var freeFromDate = moment(flat.free_from).startOf("day");

      if(minFreeFrom == null) {
        // if "sofort <-> sofort", then return false if from_date is in future 
        if(maxFreeFrom == null) {
          if(freeFromDate.isAfter(now)) {
            return false;
          }
        // if "sofort -> date", then return false if from_date is after given date
        }else if(freeFromDate.isAfter(maxFreeFrom)) {
          return false;
        }
      }else{
        if(freeFromDate.isBefore(minFreeFrom) || freeFromDate.isAfter(maxFreeFrom)) {
          return false;
        }
      }
      if(flat.latitude == undefined || flat.longitude == undefined || flat.latitude == null || flat.longitude == null){
        return false;
      }
      var filterCenter = {
        latitude: config.dataFilter.lat,
        longitude: config.dataFilter.lng
      }
      return geolib.getDistance(flat, config.dataFilter) <= config.dataFilter.radius;
    });
    console.log("Sending " + flatsOfInterest.length + " message(s) from " + this.id);
    flatsOfInterest.forEach(flat => {
      var data = flat.data;
      bots.forEach(bot => {
        switch(bot.id) {
          case "telegram": 
            var telegramBot = new TelegramBot(bot.key);
            bot.chats.forEach(chatId => {
              telegramBot.sendMessage(chatId, 
                [ 
                  data.url,
                  data.rooms + " Zi. | " + data.size + " m² | " + data.price + " € | frei ab: " + moment(data.free_from).format("DD.MM.YYYY"),
                  "",
                  "https://wohnung.sibbl.net/#/" + flat.id,
                ].join("\n")
              );
            });
            break;
        }
      })
    });
    return q.when(true);
  }
  
  scrape() {
    const defer = q.defer();
    console.log("Start scraping " + this.id);
    this.scrapeSiteCounter = 1;
    this.scrapeSite(this.config.url).then(result => {
      console.log("Finish scraping " + this.id);
      var enabledBots = config.bots.filter(bot => bot.enabled === true);
      if(enabledBots.length > 0) {
        console.log("Start sending to bots " + enabledBots.map(config => config.id).join(", ") + " (" + this.id + ")");
        this.sendBotNotifications(enabledBots, result).then(() => {
          console.log("Finish sending to bots " + this.id);
          defer.resolve();
        })
      }else{
        defer.resolve();
      }
    });
    return defer.promise;
  }
}