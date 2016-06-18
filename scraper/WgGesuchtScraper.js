var AbstractScraper = require('./AbstractScraper'),
    config = require('../config'),
    request = require('request'),
    cheerio = require('cheerio'),
    urlLib = require('url'),
    moment = require('moment'),
    q = require('q'),
    geocoder = require('geocoder');

module.exports = class WgGesuchtScraper extends AbstractScraper {
  constructor(db) {
    super(db, "wgGesucht");
    this.cookieJar = request.jar();
  }
  _isTeaser(trElement) {
    return trElement.hasClass("inlistTeaser");
  }
  _isTagesmiete(trElement) {
    return trElement.find('img[alt="Tagesmiete"]').length > 0;
  }
  _isVermietet(trElement) {
    return trElement.hasClass("listenansicht-inactive");
  }
  _isTauschangebot(trElement) {
    return trElement.find('span.glyphicon-refresh').length > 0;
  }
  _getNextPage(url, $) {
    const bottomPagination = $('#main_column .pagination-bottom-wrapper');
    const nextLink = $("ul li a:contains('»')", bottomPagination);
    if(nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    }else{
      return false;
    }
  }
  _getDbObject(url, tableRow, itemId) {
    var defer = q.defer();
    // const stadtteil = tableRow.find(".ang_spalte_stadt").text().trim();
    const miete = tableRow.find(".ang_spalte_miete").text().trim().replace("€","");
    const zimmer = tableRow.find(".ang_spalte_zimmer").text().trim();
    const freiab_str = tableRow.find(".ang_spalte_freiab").text().trim();
    let freiab;
    if(freiab_str.indexOf("sofort") >= 0) {
      freiab = moment();
    }else{
      freiab = moment(freiab_str, "DD.MM.YYYY");
    }
    const groesse = tableRow.find(".ang_spalte_groesse").text().trim().replace("m²", "");
    const relativeItemUrl = tableRow.attr("adid");
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    this.scrapeItemDetails(itemUrl).then(data => {
      data.websiteId = itemId;
      data.rooms = parseInt(zimmer);
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
    const relativeItemUrl = tableRow.attr("adid");
    const urlParts = relativeItemUrl.match(/[^\.]+\.([0-9]+)\.html/);
    if(urlParts == null || urlParts.length < 2) {
      defer.resolve(false);
      return defer.promise;
    }
    const itemId = urlParts[1];
    const freiBis = tableRow.find(".ang_spalte_freibis").text().trim();
    this.hasItemInDb(itemId).then(isInDb => {
      var ignore = this._isTagesmiete(tableRow) || this._isTauschangebot(tableRow) || this._isTeaser(tableRow) || freiBis.length > 0;
      if(ignore) {
        if(isInDb) {
          this.removeFromDb(itemId).then(() => defer.resolve(true));
        }else{
          defer.resolve(false);
        }
      }else if(this._isVermietet(tableRow)) {
        if(isInDb) {
          this._getDbObject(url, tableRow, itemId).then(data => {
            this.updateInDb(data).then(() => defer.resolve(true));
          });
        }else{
          defer.resolve(false);
        }
      }else{
        if(!isInDb) {
          this._getDbObject(url, tableRow, itemId).then(data => {
            this.insertIntoDb(data).then(() => defer.resolve(true));
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
      jar: this.cookieJar
    }, config.httpOptions);
  }
  scrapeItemDetails(url) {
    var defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if(error) {
        console.error("error while scraping item details", url, error);
      }else{
        var result = {};
        result.gone = false;
        try {
          // latitude + longitude
          const latitude = body.match(/gmap_mitte_lat\s*=\s*"([0-9\.]*)/)[1];
          result.latitude = parseFloat(latitude);
          const longitude = body.match(/gmap_mitte_lng\s*=\s*"([0-9\.]*)/)[1];
          result.longitude = parseFloat(longitude);


          const $ = cheerio.load(body);

          // alle Kosten
          let kosten = $('.headline-detailed-view-panel-title:contains("Kosten")+table');
          let miete = kosten.find("td:contains('Miete')+td").text().trim().replace('€', '');
          let nebenkosten = kosten.find("td:contains('Nebenkosten')+td").text().trim().replace('€', '');
          let sonstigeKosten = kosten.find("td:contains('Sonstige Kosten')+td").text().trim().replace('€', '');
          let kaution = kosten.find("td:contains('Kaution')+td").text().trim().replace('€', '');
          miete = parseInt(miete);
          if(Number.isNaN(miete)){
            miete = null;
          }
          nebenkosten = parseInt(nebenkosten);
          if(Number.isNaN(nebenkosten)){
            nebenkosten = null;
          }
          sonstigeKosten = parseInt(sonstigeKosten);
          if(Number.isNaN(sonstigeKosten)){
            sonstigeKosten = null;
          }
          kaution = parseInt(kaution);
          if(Number.isNaN(kaution)){
            kaution = null;
          }

          // Adresse:
          let adresse = $('.headline-detailed-view-panel-title:contains("Adresse")+p');
          adresse.find("span").html("");
          adresse = adresse.text().trim();

          result.data = {
            miete: miete,
            nebenkosten: nebenkosten,
            sonstigeKosten: sonstigeKosten,
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
        if(result.gone) {
          defer.resolve(result);
        }else{
          if(Number.isNaN(result.latitude) || Number.isNaN(result.longitude)) {
            this.getLocationOfAddress(result.data.adresse).then(res => {
              result.latitude = res.latitude;
              result.longitude = res.longitude;
              defer.resolve(result);
            }).catch(error => {
              defer.resolve(result);
            });
          }else{
            defer.resolve(result);
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
        $("#table-compact-list tbody tr").each((index, element) => {
          defers.push(this._scrapeItem(url, $(element)));
        });
        const nextPageUrl = this._getNextPage(url, $);
        if(nextPageUrl !== false && this.scrapeSiteCounter < this.config.maxPages) {
          this.scrapeSiteCounter++;
          defers.push(this.scrapeSite(nextPageUrl));
        }
        q.all(defers).then(() => defer.resolve());
      }
    });
    return defer.promise;
  }
}