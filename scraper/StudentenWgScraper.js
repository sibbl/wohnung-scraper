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
    const nextLink = $("#innercontent .wg-blaetternbox a:contains('»')");
    if (nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    } else {
      return false;
    }
  }
  async _getDbObject(url, tableRow, itemId, exists) {
    const miete = tableRow
      .find("td:nth-child(3)")
      .text()
      .replace("€", "")
      .trim();
    const groesse = tableRow
      .find("td:nth-child(4)")
      .text()
      .replace("m²", "")
      .trim();
    const freiab_str = tableRow
      .find("td:nth-child(7)")
      .text()
      .trim();

    let freiab;
    if (freiab_str.indexOf("sofort") >= 0) {
      freiab = moment();
    } else {
      freiab = moment(freiab_str, "DD.MM.YYYY");
    }

    const relativeItemUrl = tableRow.find("a").attr("href");
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    const data = await this.scrapeItemDetails(itemUrl, exists);
    data.websiteId = itemId;
    data.size = parseInt(groesse);
    data.price = parseInt(miete);
    data.url = itemUrl;
    data.free_from = freiab.toISOString();
    data.active = true;

    return data;
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
        const id = this.insertIntoDb(data);
        return {
          type: "added",
          id: id,
          data: data
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
      body = request.get(url, this._getRequestOptions());
    } catch (e) {
      throw new Error(
        `Error while scraping item details for URL "${url}" with error ${e}`
      );
    }

    const result = {};

    const $ = cheerio.load(iconv.decode(body, "iso-8859-1"));

    let adresse = null;
    result.gone = false;
    try {
      var infoBlock = $(".wg-detailinfoblock");

      //TODO: check why "ort" is unsued?
      const ort = infoBlock
        .find("tr.wg-inforow:nth-child(2) td:nth-child(2)")
        .text()
        .trim();
      const strasse = infoBlock
        .find("tr.wg-inforowb:nth-child(3) td:nth-child(2)")
        .text()
        .trim();
      adresse = config.city + ", " + strasse;

      const zimmer_str = infoBlock.find("tr td:contains('Zimmer')").text();
      const zimmer = parseInt(zimmer_str.match(/^([0-9]+)\-/)[1]);
      if (Number.isNaN(zimmer)) {
        zimmer = null;
      }

      var [kaltmiete, nebenkosten, kaution] = [
        "Kaltmiete",
        "Nebenkosten",
        "Kaution"
      ].map(item => {
        let preis = infoBlock
          .find("tr td:contains('" + item + "')")
          .text()
          .trim();
        const preis_index = preis.indexOf(item);
        const preis_int = parseInt(
          preis
            .substr(0, preis_index)
            .replace("€", "")
            .trim()
        );
        if (Number.isNaN(preis_int)) {
          return null;
        }
        return preis_int;
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
    if (result.gone || adresse == null) {
      return result;
    } else {
      if (exists) {
        return result;
      } else {
        let resolvedAddress;
        try {
          resolvedAddress = this.getLocationOfAddress(adresse);
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
      body = request.get(url, this._getRequestOptions());
    } catch (e) {
      throw new Error(`Error while scraping URL "${url}" with error ${e}`);
    }

    const $ = cheerio.load(body);
    const promises = [];
    $("#wg-ergtable tr").each((index, element) => {
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
