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
  _isVermietetByTableRow() {
    return false; //unfortunately we cannot get this from the table row, we need to update it via updateItems
  }
  _getNextPage(url, $) {
    const nextLink = $("#innercontent .wg-blaetternbox a:contains('»')");
    if(nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    }else{
      return false;
    }
  }
  _getDbObject(url, tableRow, itemId, exists) {
    exists = false;
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

    this.scrapeItemDetails(itemUrl, exists).then(data => {
      data.websiteId = itemId;
      data.size = parseInt(groesse);
      data.price = parseInt(miete);
      data.url = itemUrl;
      data.free_from = freiab.toISOString();
      data.active = true;

      defer.resolve(data);
    });
    return defer.promise;
  }
  _scrapeItem(url, tableRow) {
    const defer = q.defer();
    const relativeItemUrl = tableRow.find("a").attr("href");
    if(relativeItemUrl == null) {
      defer.resolve(false);
      return defer.promise;
    }
    const urlParts = relativeItemUrl.match(/_([0-9]+)\.html/);
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

        // var $ = cheerio.load(body);
        var $ = cheerio.load(iconv.decode(body, 'iso-8859-1'));

        let adresse = null;
        result.gone = false;
        try{
          var infoBlock = $(".wg-detailinfoblock");

          const ort = infoBlock.find("tr.wg-inforow:nth-child(2) td:nth-child(2)").text().trim();
          const strasse = infoBlock.find("tr.wg-inforowb:nth-child(3) td:nth-child(2)").text().trim();
          adresse = config.city + ", " + strasse;

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
        }catch(ex) {
          console.log("CATCHED error while scraping item", this.id, url, ex);
          result.gone = true;
          if(result.removed == null) {
            result.removed = new Date();
          }
        }
        if(result.gone || adresse == null) {
          defer.resolve(result);
        }else{
          if(exists) {
            deer.resolve(result); 
          }else{
            this.getLocationOfAddress(adresse).then(res => {
              result.latitude = res.latitude;
              result.longitude = res.longitude;
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
      if(error) {
        console.error("Error while getting URL", url);
      }else{
        const $ = cheerio.load(body);
        const defers = [];
        $("#wg-ergtable tr").each((index, element) => {
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