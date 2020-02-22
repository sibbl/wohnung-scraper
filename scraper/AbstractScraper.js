const NodeGeocoder = require("node-geocoder"),
  moment = require("moment"),
  TelegramBot = require("node-telegram-bot-api"),
  geolib = require("geolib");

module.exports = class AbstractScraper {
  constructor(db, globalConfig, scraperId) {
    if (typeof scraperId === "undefined") {
      throw new TypeError("Constructor of scraper needs a ID.");
    }
    if (typeof this.scrapeSite !== "function") {
      throw new TypeError("Scraper must override method scrapeSite.");
    }
    if (typeof this.scrapeItemDetails !== "function") {
      throw new TypeError("Scraper must override method scrapeItemDetails.");
    }

    this.db = db;
    this.globalConfig = globalConfig;
    this.id = scraperId;
    this.config = globalConfig.scraper[this.id];

    if (typeof this.config === "undefined") {
      console.warn(
        `Scraper ${scraperId} has no config and will not be loaded.`
      );
    }
  }
  async init() {
    if (!this.config) {
      return null;
    }
    await this.prepareStatements();
    return this;
  }
  async prepareStatements() {
    this.statements = {
      insert: await this.db.prepare(
        'INSERT INTO "wohnungen" (website, websiteId, url, latitude, longitude, rooms, size, price, free_from, active, gone, data, title) VALUES ($website, $websiteId, $url, $latitude, $longitude, $rooms, $size, $price, $free_from, $active, $gone, $data, $title)'
      ),
      update: await this.db.prepare(
        'UPDATE "wohnungen" SET url = $url, latitude = $latitude, longitude = $longitude, rooms = $rooms, size = $size, price = $price, free_from = $free_from, active = $active, gone = $gone, data = $data, website = $website, websiteId = $websiteId, removed = $removed, comment = $comment, favorite = $favorite, title = $title WHERE id = $id'
      ),
      update_gone: await this.db.prepare(
        'UPDATE "wohnungen" SET gone = $gone, removed = $removed WHERE id = $id'
      ),
      hasId: await this.db.prepare(
        'SELECT COUNT(*) AS count FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId'
      ),
      delete: await this.db.prepare(
        'DELETE FROM "wohnungen" WHERE website = $website AND websiteId = $websiteId'
      ),
      getActiveItems: await this.db.prepare(
        'SELECT * FROM "wohnungen" WHERE website = $website AND gone = 0'
      )
    };
  }
  async insertIntoDb(row) {
    try {
      return await this.statements.insert.run({
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
        $data:
          typeof row.data === "string" ? row.data : JSON.stringify(row.data),
        $title: row.title
      });
    } catch (e) {
      throw new Error(
        `Error while inserting into database (ID=${this.id}, error: ${e}`
      );
    }
  }
  async updateInDb(row) {
    try {
      if (row.gone) {
        return await this.statements.update_gone.run({
          $id: row.id,
          $gone: row.gone,
          $removed:
            row.removed == null ? null : moment(row.removed).toISOString()
        });
      } else {
        return await this.statements.update.run({
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
          $removed:
            row.removed == null ? null : moment(row.removed).toISOString(),
          $comment: row.comment,
          $favorite: row.favorite,
          $data:
            typeof row.data === "string" ? row.data : JSON.stringify(row.data),
          $title: row.title
        });
      }
    } catch (e) {
      throw new Error(
        `Error while updating in database (ID=${this.id}, error: ${e})`
      );
    }
  }
  async removeFromDb(id) {
    try {
      await this.statements.delete.run({
        $website: this.id,
        $websiteId: id
      });
    } catch (e) {
      throw new Error(
        `Error while deleting from database (ID=${this.id}, error: ${e})`
      );
    }
  }
  async hasItemInDb(id) {
    try {
      const { count } = await this.statements.hasId.get({
        $website: this.id,
        $websiteId: id
      });
      return count > 0;
    } catch (e) {
      throw new Error(
        `Error while checking existing items (ID=${this.id}, error: ${e})`
      );
    }
  }
  async getLocationOfAddress(address) {
    const addressWithoutPhrasesInParentheses = address.replace(
      / *\([^)]*\) */g,
      " "
    );
    if (addressWithoutPhrasesInParentheses.length == 0) {
      throw new Error(`Trying to geocode invalid address: ${address}`);
    } else {
      const provider = this.globalConfig.geocoder.provider;
      let params = {};
      if (provider in this.globalConfig.geocoder.options) {
        params = this.globalConfig.geocoder.options[provider];
      }
      params.provider = provider;
      const geocoder = NodeGeocoder(params);
      let res;
      try {
        res = await geocoder.geocode(addressWithoutPhrasesInParentheses);
      } catch (e) {
        throw new Error(
          `Failed to geocode address "${address}" with error: ${e}`
        );
      }
      if (!Array.isArray(res) || res.length < 1) {
        throw new Error(
          `Failed to geocode address "${address}" with result: ${res}`
        );
      } else {
        return {
          ...res[0]
        };
      }
    }
  }
  async getActiveItems(id) {
    try {
      return await this.statements.getActiveItems.all({
        $website: this.id
      });
    } catch (e) {
      throw new Error(
        `Error while getting all active items from database (ID=${this.id} / ${id}) and error ${e}`
      );
    }
  }

  async _updateItemsSync(rows) {
    for (let row of rows) {
      const data = await this.scrapeItemDetails(row.url, true);
      await this.updateInDb({ ...row, ...data });
    }
  }
  async updateItems() {
    console.log(`Start updating ${this.id} at ${new Date().toISOString()}`);
    const rows = await this.getActiveItems();
    await this._updateItemsSync(rows);
    console.log(`Finished updating ${this.id} at ${new Date().toISOString()}`);
  }

  sendBotNotifications(bots, result) {
    // use only added flats
    var flatsOfInterest = result.filter(result => {
      var flat = result.data;
      if (result.type != "added") {
        return false;
      }
      var filters = this.globalConfig.filters.default;
      if (flat.price < filters.price.min || flat.price > filters.price.max) {
        return false;
      }
      if (flat.rooms < filters.rooms.min || flat.rooms > filters.rooms.max) {
        return false;
      }
      if (flat.size < filters.size.min || flat.size > filters.size.max) {
        return false;
      }
      var free_from = [null];
      var start = moment()
        .startOf("month")
        .startOf("day")
        .subtract(1, "day"); //use last day of last month
      var startIsMonthBegin = true;
      var now = moment().startOf("day");
      if (start.isBefore(now)) {
        //if start is before now (e.g. 30th of last month is before 5th)
        start = start.add(14, "days"); //then try 14th of current month
        startIsMonthBegin = false;
        if (start.isBefore(now)) {
          //if it's still before now (e.g. 14th is before 20th)
          //add one month to last date
          start = moment()
            .startOf("month")
            .startOf("day")
            .add(1, "month")
            .subtract(1, "day");
          startIsMonthBegin = true;
        }
      }
      //generate 8 values (next 4 months)
      for (var i = startIsMonthBegin ? 0 : 1; i < 8; i++) {
        if (i % 2 == 1) {
          //middle of month
          free_from.push(start.clone());
          start = start
            .add(1, "month")
            .startOf("month")
            .startOf("day")
            .subtract(1, "day"); //last day of month
        } else {
          //start of month
          free_from.push(start.clone());
          start = start.add(14, "days"); //14th of current month
        }
      }

      var minFreeFrom = free_from[filters.free_from.min];
      var maxFreeFrom = free_from[filters.free_from.max];
      var freeFromDate = moment(flat.free_from).startOf("day");

      if (minFreeFrom == null) {
        // if "sofort <-> sofort", then return false if from_date is in future
        if (maxFreeFrom == null) {
          if (freeFromDate.isAfter(now)) {
            return false;
          }
          // if "sofort -> date", then return false if from_date is after given date
        } else if (freeFromDate.isAfter(maxFreeFrom)) {
          return false;
        }
      } else {
        if (
          freeFromDate.isBefore(minFreeFrom) ||
          freeFromDate.isAfter(maxFreeFrom)
        ) {
          return false;
        }
      }
      if (!flat.latitude || !flat.longitude) {
        return false;
      }
      const filterCenter = {
        latitude: this.globalConfig.dataFilter.lat,
        longitude: this.globalConfig.dataFilter.lng
      };
      const distance = geolib.getDistance(flat, filterCenter);
      return distance <= this.globalConfig.dataFilter.radius;
    });
    console.log(
      "Sending " + flatsOfInterest.length + " message(s) from " + this.id
    );
    flatsOfInterest.forEach(flat => {
      var data = flat.data;
      bots.forEach(bot => {
        switch (bot.id) {
          case "telegram":
            var telegramBot = new TelegramBot(bot.key);
            bot.chats.forEach(chatId => {
              telegramBot.sendMessage(
                chatId,
                [
                  data.url,
                  data.rooms +
                    " Zi. | " +
                    data.size +
                    " m² | " +
                    data.price +
                    " € | frei ab: " +
                    moment(data.free_from).format("DD.MM.YYYY"),
                  "",
                  `${config.baseUrl}#/${flat.id}`
                ].join("\n")
              );
            });
            break;
        }
      });
    });
  }

  async scrape() {
    console.log(`Start scraping ${this.id} at ${new Date().toISOString()}`);
    this.scrapeSiteCounter = 1;
    const result = await this.scrapeSite(this.config.url);
    var flatResult = [];
    var fillResult = result => {
      for (var i = 0; i < result.length; i++) {
        if (Array.isArray(result[i])) {
          fillResult(result[i]);
        } else if (typeof result[i] === "object") {
          flatResult.push(result[i]);
        }
      }
    };
    fillResult(result);

    var enabledBots = this.globalConfig.bots.filter(
      bot => bot.enabled === true
    );
    if (enabledBots.length > 0) {
      console.log(
        "Start sending to bots " +
          enabledBots.map(config => config.id).join(", ") +
          " (" +
          this.id +
          ")"
      );
      this.sendBotNotifications(enabledBots, flatResult);
      console.log("Finish sending to bots " + this.id);
    }
    console.log(`Finished scraping ${this.id} at ${new Date().toISOString()}`);
  }

  async doRequest(url, req) {
    let response;
    try {
      response = await req;
    } catch (e) {
      console.warn(`Failed to scrape ${url} because of`, e.message);
      response = e.response;

      // transform as we rely on valid objects here and there :(
      if (!response) {
        console.warn(
          `Didn't get any response for ${url} and will use statusCode -1 and empty body.`
        );
        response = {
          statusCode: -1,
          body: ""
        };
      }
    }
    return response;
  }
};
