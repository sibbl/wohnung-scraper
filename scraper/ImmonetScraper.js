var AbstractScraper = require("./AbstractScraper"),
  request = require("request-promise"),
  cheerio = require("cheerio"),
  urlLib = require("url"),
  moment = require("moment"),
  iconv = require("iconv-lite");

iconv.skipDecodeWarning = true;
module.exports = class ImmonetScraper extends AbstractScraper {
  constructor(db, globalConfig) {
    super(db, globalConfig, "immonet");
    this.cookieJar = request.jar();
  }
  _isAngebot(tableRow) {
    return true;
  }
  _isVermietetByTableRow() {
    return false; //unfortunately we cannot get this from the table row, we need to update it via updateItems
  }
  _getNextPage(url, $) {
    const nextLink = $(".pagination-wrapper+a[href]");
    if (nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    } else {
      return false;
    }
  }
  async _getDbObject(url, tableRow, itemId, exists) {
    const groesse = tableRow
      .find("div[id^='selArea'] p:nth-child(2)")
      .text()
      .replace("m²", "")
      .trim();
    const rooms = tableRow
      .find("div[id^='selRooms'] p:nth-child(2)")
      .text()
      .trim();

    const relativeItemUrl = tableRow.find("a[id^='lnkToDetails']").attr("href");
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    const data = await this.scrapeItemDetails(itemUrl, exists);
    data.websiteId = itemId;
    data.size = parseFloat(groesse);
    data.rooms = parseFloat(rooms);
    data.url = itemUrl;
    data.active = true;

    return data;
  }
  async _scrapeItem(url, tableRow) {
    const relativeItemUrl = tableRow.find("a[id^='lnkToDetails']").attr("href");
    if (relativeItemUrl == null) {
      return false;
    }
    const urlParts = relativeItemUrl.match(/\/([0-9]+)$/);
    if (urlParts == null || urlParts.length < 2) {
      return false;
    }
    const itemId = urlParts[1];
    const isInDb = await this.hasItemInDb(itemId);
    const ignore = !this._isAngebot(tableRow);
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
      resolveWithFullResponse: true,
      jar: this.cookieJar,
      encoding: null,
      ...this.globalConfig.httpOptions
    };
  }
  async scrapeItemDetails(url, exists) {
    const { body, statusCode } = await this.doRequest(
      url,
      request.get(url, this._getRequestOptions())
    );

    const result = {};

    const bodyStr = iconv.decode(body, "iso-8859-1");
    const $ = cheerio.load(body);

    let isGone = false;
    $("h2").each((_, elem) => {
      if (
        $(elem)
          .text()
          .trim() === "Objekt nicht mehr verfügbar."
      ) {
        isGone = true;
      }
    });

    result.gone = statusCode !== 200 || isGone;
    try {
      const title = $("#expose-headline")
        .text()
        .trim();
      result.title = title;

      const makePrice = str => {
        return parseFloat(str.replace("€", "").trim());
      };
      result.data = {};
      result.data.kaltmiete = makePrice($("#priceid_2").text());
      result.data.warmmiete = makePrice($("#priceid_4").text());
      result.data.nebenkosten = makePrice($("#priceid_20").text());
      result.data.heizkosten = makePrice($("#priceid_5").text());
      result.data.betriebskosten = makePrice($("#priceid_3").text());

      let warmmiete = result.data.warmmiete;
      if (Number.isNaN(warmmiete)) {
        warmmiete = result.data.kaltmiete;
        if (!Number.isNaN(result.data.nebenkosten)) {
          warmmiete += result.data.nebenkosten;
        }
        if (!Number.isNaN(result.data.heizkosten)) {
          warmmiete += result.data.heizkosten;
        }
        if (!Number.isNaN(result.data.betriebskosten)) {
          warmmiete += result.data.betriebskosten;
        }
      }

      result.price = warmmiete;

      const latLngParts = bodyStr.match(
        /lat:\s*([0-9\.]+),\s*lng:\s*([0-9\.]+)/
      );
      result.latitude = parseFloat(latLngParts[1]);
      result.longitude = parseFloat(latLngParts[2]);

      result.data.adresse = $("#tsr-int-map-anchor-xs-icon ~ p")
        .text()
        .replace("Auf Karte anzeigen", "")
        .trim();

      let freiab;
      const freiab_str = $("#deliveryValue")
        .text()
        .trim();
      if (freiab_str.indexOf("sofort") >= 0) {
        freiab = moment();
      } else {
        freiab = moment(freiab_str, "DD.MM.YYYY");
      }
      result.free_from = freiab.toISOString();

      const features = [];
      $("#panelFeatures ul:first-child li").each((_, element) => {
        features.push(
          $(element)
            .find("span.block")
            .text()
            .trim()
        );
      });
      result.data.features = features;
    } catch (ex) {
      console.log("CAUGHT error while scraping item", this.id, url, ex);
      result.gone = true;
      if (result.removed == null) {
        result.removed = new Date();
      }
    }
    return result;
  }
  async scrapeSite(url) {
    const { body } = await this.doRequest(
      url,
      request.get(url, this._getRequestOptions())
    );

    const $ = cheerio.load(body);
    const promises = [];
    $("#result-list-stage > div").each((_, element) => {
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

    return await Promise.all(promises);
  }
};
