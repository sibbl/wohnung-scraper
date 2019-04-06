var AbstractScraper = require("./AbstractScraper"),
  config = require("../config"),
  request = require("request"),
  cheerio = require("cheerio"),
  urlLib = require("url"),
  moment = require("moment"),
  q = require("q");

module.exports = class WgGesuchtScraper extends AbstractScraper {
  constructor(db) {
    super(db, "immoscout24");
    this.cookieJar = request.jar();
  }
  _getNextPage(url, $) {
    const nextLink = $("#listContainer a[data-is24-qa='paging_bottom_next']");
    if (nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    } else {
      return false;
    }
  }
  _getDbObject(url, tableRow, itemId, relativeItemUrl, exists) {
    var defer = q.defer();
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    this.scrapeItemDetails(itemUrl, exists).then(data => {
      data.url = itemUrl;
      data.websiteId = itemId;
      data.active = true;

      defer.resolve(data);
    });
    return defer.promise;
  }
  _scrapeItem(url, tableRow) {
    const defer = q.defer();

    const linkElem = tableRow.find(".result-list-entry__brand-title-container");
    const relativeItemUrl = linkElem.attr("href");
    let itemId = null;
    if (typeof relativeItemUrl !== "undefined") {
      const urlParts = relativeItemUrl.match(/[0-9]+$/);
      itemId = urlParts[0];
    }
    if (itemId == null) {
      defer.resolve(false);
      return defer.promise;
    }
    this.hasItemInDb(itemId).then(isInDb => {
      if (isInDb) {
        this._getDbObject(url, tableRow, itemId, relativeItemUrl, true).then(
          data => {
            this.updateInDb(data).then(() =>
              defer.resolve({
                type: "updated",
                data: data
              })
            );
          }
        );
      } else {
        this._getDbObject(url, tableRow, itemId, relativeItemUrl).then(data => {
          this.insertIntoDb(data).then(id =>
            defer.resolve({
              type: "added",
              id: id,
              data: data
            })
          );
        });
      }
    });
    return defer.promise;
  }
  _getRequestOptions() {
    return Object.assign(
      {
        jar: this.cookieJar
      },
      config.httpOptions
    );
  }
  scrapeItemDetails(url, exists) {
    var defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if (error) {
        console.error("error while scraping item details", url, error);
      } else {
        var result = {};
        result.data = {};
        result.gone = false;
        try {
          const $ = cheerio.load(body);
          const getNumericValue = function(selector) {
            const elem = $(selector);
            elem.find(".is24-operator").remove();
            let number = parseInt(
              elem
                .text()
                .replace(".", "")
                .replace("ca", "")
                .replace(",", ".")
                .trim()
            );
            return Number.isNaN(number) ? null : number;
          };
          const getStrValue = function(selector) {
            const elem = $(selector);
            if (typeof elem === "undefined") {
              return null;
            }
            elem.find(".is24-operator").remove();
            return elem.text().trim();
          };
          result.size = getNumericValue(".is24qa-wohnflaeche-ca");
          result.rooms = getNumericValue(".is24qa-zimmer");
          result.price = getNumericValue(".is24qa-gesamtmiete");
          result.data.miete = result.price;

          const freiab_str = getStrValue(".is24qa-bezugsfrei-ab");
          let freiab;
          if (
            freiab_str.toLowerCase().indexOf("sofort") >= 0 ||
            freiab_str.toLowerCase().indexOf("bezugsfrei") >= 0
          ) {
            freiab = moment();
          } else {
            freiab = moment(freiab_str, "DD.MM.YYYY");
            if (!freiab.isValid()) {
              freiab = moment(); //fallback
            }
          }
          result.free_from = freiab.toISOString();

          result.data.kaltmiete = getNumericValue(".is24qa-kaltmiete");
          result.data.nebenkosten = getNumericValue(".is24qa-nebenkosten");
          result.data.heizkosten = getNumericValue(".is24qa-heizkosten");
          result.data.garageStellplatz = getNumericValue(
            ".is24qa-miete-fuer-garagestellplatz"
          );
          result.data.kaution = getStrValue(
            ".is24qa-kaution-o-genossenschaftsanteile"
          );
          result.data.etage = getStrValue(".is24qa-etage");
          result.data.type = getStrValue(".is24qa-wohnungstyp");
          result.data.tags = [];
          $(".boolean-listing span").each((index, element) => {
            result.data.tags.push($(element).text());
          });

          const addressBlock = $("span[data-qa='is24-expose-address']");
          addressBlock.find("#is24-expose-map-teaser-link").remove();
          result.data.adresse = addressBlock
            .text()
            .trim()
            .replace(
              "Die vollständige Adresse der Immobilie erhalten Sie vom Anbieter.",
              ""
            );
        } catch (ex) {
          console.log("CATCHED error while scraping item", this.id, url, ex);
          result.gone = true;
          if (result.removed == null) {
            result.removed = new Date();
          }
        }
        if (result.gone) {
          defer.resolve(result);
        } else {
          if (exists) {
            defer.resolve(result);
          } else {
            this.getLocationOfAddress(result.data.adresse)
              .then(res => {
                result.latitude = res.latitude;
                result.longitude = res.longitude;
                defer.resolve(result);
              })
              .catch(error => {
                defer.resolve(result);
              });
          }
        }
      }
    });
    return defer.promise;
  }
  scrapeSite(url) {
    const defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if (error) {
        console.error("Error while getting URL", url);
      } else {
        const $ = cheerio.load(body);
        const defers = [];
        $("#resultListItems .result-list__listing").each((index, element) => {
          defers.push(this._scrapeItem(url, $(element)));
        });
        const nextPageUrl = this._getNextPage(url, $);
        if (
          nextPageUrl !== false &&
          this.scrapeSiteCounter < this.config.maxPages
        ) {
          this.scrapeSiteCounter++;
          defers.push(this.scrapeSite(nextPageUrl));
        }
        q.all(defers).then(result => defer.resolve(result));
      }
    });
    return defer.promise;
  }
};
