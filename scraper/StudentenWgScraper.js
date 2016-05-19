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

module.exports = class WgGesuchtScraper extends AbstractScraper {
  constructor(db) {
    super(db, "studentenWg");
    this.cookieJar = request.jar();
  }
  _isAngebot(tableRow) {
    var id = tableRow.attr("id");
    if(id != null && id.indexOf("wg-ergrow") === 0) {
      return true;
    }
    return false;
  }
  _isVermietet() {
    return false;
  }
  _getNextPage(url, $) {
    const nextLink = $("#innercontent .wg-blaetternbox a:contains('»')");
    if(nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    }else{
      return false;
    }
  }
  _getDbObject(url, tableRow, itemId) {
    var defer = q.defer();
    const miete = tableRow.find("td:nth-child(3)").text().replace("€","").trim();
    const groesse = tableRow.find("td:nth-child(4)").text().replace("m²","").trim();
    const freiab_str = tableRow.find("td:nth-child(7)").text().trim();


    let freiab;
    if(freiab_str.indexOf("sofort") >= 0) {
      freiab = moment();
    }else{
      freiab = moment(freiab_str, "DD.MM.YYYY");
    }

    const relativeItemUrl = tableRow.find("a").attr("href");
    const urlParts = relativeItemUrl.match(/_([0-9]+)\.html/);
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    this._scrapeItemDetails(itemUrl).then(data => {
      data.id = itemId;
      data.size = parseInt(groesse);
      data.price = parseInt(miete);
      data.url = itemUrl;
      data.free_from = freiab.toISOString();
      data.active = !this._isVermietet(tableRow);

      defer.resolve(data);
    });
    return defer.promise;
  }
  _scrapeItem(url, tableRow) {
    const relativeItemUrl = tableRow.find("a").attr("href");
    if(relativeItemUrl == null) {
      return;
    }
    const urlParts = relativeItemUrl.match(/_([0-9]+)\.html/);
    if(urlParts == null || urlParts.length < 2) {
      return;
    }
    const itemId = urlParts[1];
    this.hasItemInDb(itemId).then(isInDb => {
      var ignore = !this._isAngebot(tableRow);
      if(ignore) {
        if(isInDb) {
          this.removeFromDb(itemId);
        }
        return;
      }else if(this._isVermietet(tableRow)) {
        if(isInDb) {
          this._getDbObject(url, tableRow, itemId).then(data => {
            this.updateInDb(data);
          });
        }
      }else{
        this._getDbObject(url, tableRow, itemId).then(data => {
          this.insertIntoDb(data);
        });
      }
    });
  }
  _getRequestOptions() {
    return Object.assign({
      jar: this.cookieJar,
      encoding: null
    }, config.httpOptions);
  }
  _scrapeItemDetails(url) {
    var defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if(error) {
        console.error("error while scraping item details", url, error);
      }else{
        var result = {};

        // var $ = cheerio.load(body);
        var $ = cheerio.load(iconv.decode(body, 'iso-8859-1'));

        var infoBlock = $(".wg-detailinfoblock");

        const ort = infoBlock.find("tr.wg-inforow:nth-child(2) td:nth-child(2)").text().trim();
        const strasse = infoBlock.find("tr.wg-inforowb:nth-child(3) td:nth-child(2)").text().trim();
        let adresse = "Berlin, " + strasse;

        const zimmer_str = infoBlock.find("tr td:contains('Zimmer')").text();
        const zimmer = parseInt(zimmer_str.match(/^([0-9]+)\-/)[1]);
        if(Number.isNaN(zimmer)) {
          zimmer = null;
        }

        var [kaltmiete, nebenkosten, kaution] = ["Kaltmiete", "Nebenkosten", "Kaution"].map(item => {
          let preis = infoBlock.find("tr td:contains('" + item + "')").text().trim();
          const preis_index = preis.indexOf(item);
          const preis_int = parseInt(preis.substr(0, preis_index).replace("€", "").trim());
          if(Number.isNaN(preis_int)) {
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
        }

        this.getLocationOfAddress(adresse).then(res => {
          result.latitude = res.latitude;
          result.longitude = res.longitude;
          defer.resolve(result);
        });
      }
    });
    return defer.promise;
  }
  _scrapeSite(url) {
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if(error) {
        console.error("Error while getting URL", url);
      }else{
        const $ = cheerio.load(body);
        $("#wg-ergtable tr").each((index, element) => {
          this._scrapeItem(url, $(element));
        });
        const nextPageUrl = this._getNextPage(url, $);
        if(nextPageUrl !== false && this.scrapeSiteCounter < this.config.maxPages) {
          this.scrapeSiteCounter++;
          this._scrapeSite(nextPageUrl);
        }
      }
    });
  }
  scrape() {
    this.scrapeSiteCounter = 1;
    this._scrapeSite(this.config.url);
  };
}