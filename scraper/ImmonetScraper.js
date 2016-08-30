var AbstractScraper = require('./AbstractScraper'),
    config = require('../config'),
    request = require('request'),
    cheerio = require('cheerio'),
    urlLib = require('url'),
    moment = require('moment'),
    q = require('q'),
    geocoder = require('geocoder'),
    iconv = require("iconv-lite");

iconv.skipDecodeWarning = true;
module.exports = class ImmonetScraper extends AbstractScraper {
  constructor(db) {
    super(db, "immonet");
    this.cookieJar = request.jar();
  }
  _isAngebot(tableRow) {
    return true;
  }
  _isVermietetByTableRow() {
    return false; //unfortunately we cannot get this from the table row, we need to update it via updateItems
  }
  _getNextPage(url, $) {
    const nextLink = $("a.paginationNext[href]");
    if(nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    }else{
      return false;
    }
  }
  _getDbObject(url, tableRow, itemId, exists) {
    var defer = q.defer();
    const groesse = tableRow.find(".objDetails li:nth-child(3)").text().replace("Wohnfläche", "").replace("m²","").trim();
    const rooms = tableRow.find(".objDetails li:nth-child(2)").text().replace("Zimmer", "").trim();

    const relativeItemUrl = tableRow.find("a.title").attr("href");
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    this.scrapeItemDetails(itemUrl, exists).then(data => {
      data.websiteId = itemId;
      data.size = parseFloat(groesse.replace(".", "").replace(",", "."));
      data.rooms = parseFloat(rooms.replace(".", "").replace(",", "."));
      data.url = itemUrl;
      data.active = true;

      defer.resolve(data);
    });
    return defer.promise;
  }
  _scrapeItem(url, tableRow) {
    const defer = q.defer();
    const relativeItemUrl = tableRow.find("a.title").attr("href");
    if(relativeItemUrl == null) {
      defer.resolve(false);
      return defer.promise;
    }
    const urlParts = relativeItemUrl.match(/\/([0-9]+)$/);
    if(urlParts == null || urlParts.length < 2) {
      defer.resolve(false);
      return defer.promise;
    }
    const itemId = urlParts[1];
    this.hasItemInDb(itemId).then(isInDb => {
      var ignore = !this._isAngebot(tableRow);
      if(ignore) {
        if(isInDb) {
          this.removeFromDb(itemId).then(() => defer.resolve(true));
        }else{
          defer.resolve(false);
        }
      }else if(this._isVermietetByTableRow(tableRow)) {
        if(isInDb) {
          this._getDbObject(url, tableRow, itemId, true).then(data => {
            this.updateInDb(data).then(() => defer.resolve({
              type: "updated",
              data: data
            }));
          });
        }else{
          defer.resolve(false);
        }
      }else{
        if(!isInDb) {
          this._getDbObject(url, tableRow, itemId).then(data => {
            this.insertIntoDb(data).then(id => defer.resolve({
              type: "added",
              id: id,
              data: data
            }));
          });
        }else{
          defer.resolve(false);
        }
      }
    });
    return defer.promise;
  }
  _getRequestOptions() {
    return Object.assign({
      jar: this.cookieJar,
      encoding: null
    }, config.httpOptions);
  }
  scrapeItemDetails(url, exists) {
    var defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if(error) {
        console.error("error while scraping item details", url, error);
        defer.reject();
      }else{
        var result = {};

        var bodyStr = iconv.decode(body, 'iso-8859-1');
        var $ = cheerio.load(body);

        let adresse = null;
        result.gone = false;
        try{
          var makePrice = function(str) {
            return parseFloat(str.replace("€", "").trim());
          }
          result.data = {};
          result.data.kaltmiete = makePrice($("#priceid_2").text());
          result.data.warmmiete = makePrice($("#priceid_4").text());
          result.data.nebenkosten = makePrice($("#priceid_20").text());
          result.data.heizkosten = makePrice($("#priceid_5").text());
          result.data.betriebskosten = makePrice($("#priceid_3").text());

          var warmmiete = result.data.warmmiete;
          if(Number.isNaN(warmmiete)) {
            warmmiete = result.data.kaltmiete;
            if(!Number.isNaN(result.data.nebenkosten)) {
              warmmiete += result.data.nebenkosten;
            }
            if(!Number.isNaN(result.data.heizkosten)) {
              warmmiete += result.data.heizkosten;
            }
            if(!Number.isNaN(result.data.betriebskosten)) {
              warmmiete += result.data.betriebskosten;
            }
          }

          result.price = warmmiete;

          var latLngParts = bodyStr.match(/"latitude":([0-9\.]+),\s*"longitude":([0-9\.]+)/);
          result.latitude = parseFloat(latLngParts[1]);
          result.longitude = parseFloat(latLngParts[2]);

          result.data.adresse = $("#tsr-int-map-fullscreen .popover-content span:first-child").text().trim();

          var freiab;
          var freiab_str = $("#deliveryValue").text();
          if(freiab_str.indexOf("sofort") >= 0) {
            freiab = moment();
          }else{
            freiab = moment(freiab_str, "DD.MM.YYYY");
          }
          result.free_from = freiab.toISOString();

          var features = [];
          $("#panelFeatures ul:first-child li").each((index, element) => {
              features.push($(element).find("span.block").text().trim());
          });
          result.data.features = features;
        }catch(ex) {
          console.log("CATCHED error while scraping item", this.id, url, ex);
          result.gone = true;
          if(result.removed == null) {
            result.removed = new Date();
          }
        }
        defer.resolve(result);
      }
    });
    return defer.promise;
  }
  scrapeSite(url) {
    const defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if(error) {
        console.error("Error while getting URL", url);
      }else{
        const $ = cheerio.load(body);
        const defers = [];
        $("#idResultList .listObject").each((index, element) => {
          defers.push(this._scrapeItem(url, $(element)));
        });
        const nextPageUrl = this._getNextPage(url, $);
        if(nextPageUrl !== false && this.scrapeSiteCounter < this.config.maxPages) {
          this.scrapeSiteCounter++;
          defers.push(this.scrapeSite(nextPageUrl));
        }
        q.all(defers).then(result => defer.resolve(result));
      }
    });
    return defer.promise;
  }
}