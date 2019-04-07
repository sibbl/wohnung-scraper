var AbstractScraper = require("./AbstractScraper"),
  config = require("../config"),
  request = require("request-promise"),
  cheerio = require("cheerio"),
  urlLib = require("url"),
  moment = require("moment"),
  iconv = require("iconv-lite");

iconv.skipDecodeWarning = true;

module.exports = class WgGesuchtScraper extends AbstractScraper {
  constructor(db) {
    super(db, "studentenWg");
    this.cookieJar = request.jar();
  }
  _isAngebot(tableRow) {
    var id = tableRow.attr("id");
    if (id != null && id.indexOf("wg-ergrow") === 0) {
      return true;
    }
    return false;
  }
  _isVermietetByTableRow() {
    return false; //unfortunately we cannot get this from the table row, we need to update it via updateItems
  }
  _getNextPage(url, $) {
    const nextLink = $(".pagination li:not(.disabled) a:contains('»')");
    if (nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    } else {
      return false;
    }
  }
  async _getDbObject(url, tableRow, itemId, exists) {
    const prices = tableRow
      .find(".property-features p:nth-child(2)")
      .text()
      .match(/(\d+)/);

    const groesse = tableRow
      .find(".property-features p:nth-child(1)")
      .text()
      .replace("m2", "")
      .trim();
    const freiab_str = tableRow.find(".property-text small").text();

    let freiab;
    if (freiab_str.indexOf("sofort") >= 0) {
      freiab = moment();
    } else {
      freiab = moment(
        freiab_str.match(/Miete ab (\d+\.\d+\.\d+)/),
        "DD.MM.YYYY"
      );
    }

    const relativeItemUrl = tableRow.find("a").attr("href");
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    const result = await this.scrapeItemDetails(itemUrl, exists);
    result.websiteId = itemId;
    result.size = parseInt(groesse);
    result.price = parseInt(prices[1]);
    result.url = itemUrl;
    result.free_from = freiab.toISOString();
    result.active = true;

    return result;
  }
  async _scrapeItem(url, tableRow) {
    const relativeItemUrl = tableRow.find("a").attr("href");
    if (relativeItemUrl == null) {
      return false;
    }
    const urlParts = relativeItemUrl.match(/_([0-9]+)\.html/);
    if (urlParts == null || urlParts.length < 2) {
      return false;
    }
    const itemId = urlParts[1];
    const isInDb = await this.hasItemInDb(itemId);

    var ignore = !this._isAngebot(tableRow);
    if (ignore) {
      if (isInDb) {
        await this.removeFromDb(itemId);
        return true;
      } else {
        return false;
      }
    } else if (this._isVermietetByTableRow(tableRow)) {
      if (isInDb) {
        const data = await this._getDbObject(url, tableRow, itemId, true);
        await this.updateInDb(data);
        return {
          type: "updated",
          data: data
        };
      } else {
        return false;
      }
    } else {
      if (!isInDb) {
        const data = await this._getDbObject(url, tableRow, itemId);
        const { lastID } = await this.insertIntoDb(data);
        return {
          type: "added",
          id: lastID,
          data
        };
      } else {
        return false;
      }
    }
  }
  _getRequestOptions() {
    return {
      jar: this.cookieJar,
      encoding: null,
      ...config.httpOptions
    };
  }
  async scrapeItemDetails(url, exists) {
    let body;
    try {
      body = await request.get(url, this._getRequestOptions());
    } catch (e) {
      throw new Error(
        `Error while scraping item details for URL "${url}" with error ${e}`
      );
    }

    const result = {};

    const $ = cheerio.load(iconv.decode(body, "iso-8859-1"));

    result.gone = false;
    try {
      const adresse = $("#xlocation h4")
        .first()
        .text()
        .trim();

      const zimmer_str = $(".ausstattung")
        .first()
        .text()
        .match(/(\d+)-Zimmer-Wohnung/);
      let zimmer;
      if (!zimmer_str) {
        zimmer = null;
      } else {
        zimmer = parseInt(zimmer_str[1]);
        if (Number.isNaN(zimmer)) {
          zimmer = null;
        }
      }

      var [kaltmiete, nebenkosten, kaution] = [
        "Kaltmiete",
        "Nebenkosten",
        "Kaution"
      ].map(item => {
        const preis_str = $("#detail h3 ~div:contains('" + item + "') h4")
          .text()
          .match(/(\d+)\s€/);

        if (!preis_str) {
          return null;
        }
        const preis = parseInt(preis_str[1]);
        if (Number.isNaN(preis)) {
          return null;
        }
        return preis;
      });

      result.rooms = zimmer;
      result.data = {
        miete: kaltmiete,
        nebenkosten: nebenkosten,
        kaution: kaution,
        adresse: adresse
      };
    } catch (ex) {
      console.log("CATCHED error while scraping item", this.id, url, ex);
      result.gone = true;
      if (result.removed == null) {
        result.removed = new Date();
      }
    }
    if (result.gone || result.data.adresse == null) {
      return result;
    } else {
      if (exists) {
        return result;
      } else {
        let resolvedAddress;
        try {
          resolvedAddress = await this.getLocationOfAddress(result.data.adresse);
        } catch (_) {
          return result;
        }
        result.latitude = resolvedAddress.latitude;
        result.longitude = resolvedAddress.longitude;
        return result;
      }
    }
  }
  async scrapeSite(url) {
    let body;
    try {
      body = await request.get(url, this._getRequestOptions());
    } catch (e) {
      throw new Error(`Error while scraping URL "${url}" with error ${e}`);
    }

    const $ = cheerio.load(body);
    const promises = [];
    $(".container-realestate .property-container").each((index, element) => {
      promises.push(this._scrapeItem(url, $(element)));
    });
    const nextPageUrl = this._getNextPage(url, $);
    if (
      nextPageUrl !== false &&
      this.scrapeSiteCounter < this.config.maxPages
    ) {
      this.scrapeSiteCounter++;
      promises.push(this.scrapeSite(nextPageUrl));
    }
    return Promise.all(promises);
  }
};
