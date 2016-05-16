var AbstractScraper = require('./AbstractScraper'),
    config = require('../config'),
    request = require('request'),
    cheerio = require('cheerio'),
    urlLib = require('url'),
    moment = require('moment'),
    q = require('q');

module.exports = class WgGesuchtScraper extends AbstractScraper {
  constructor() {
    super("wgGesucht");
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
  _scrapeItem(url, tableRow) {
    if(this._isTagesmiete(tableRow)) {
      // console.log("skip... Tagesmiete");
    }else if(this._isVermietet(tableRow)) {
      // console.log("skip... vermietet");
    }else if(this._isTauschangebot(tableRow)) {
      // console.log("skip... Tauschangebot");
    }else if(this._isTeaser(tableRow)) {
      // console.log("skip... Teaser");
    }else{
      const freiBis = tableRow.find(".ang_spalte_freibis").text().trim();
      if(freiBis.length > 0) {
        // console.log("skip... befristet");
      }else{
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
        const itemId = relativeItemUrl.match(/[^\.]+\.([0-9]+)\.html/)[1];
        const itemUrl = urlLib.resolve(url, relativeItemUrl);

        this.hasItemInDb(itemId).then(hasItem => {
          if(!hasItem) {
            this._scrapeItemDetails(itemUrl).then(data => {
              data.id = itemId;
              data.rooms = parseInt(zimmer);
              data.size = parseInt(groesse);
              data.price = parseInt(miete);
              data.url = itemUrl;
              data.free_from = freiab.toISOString();

              this.insertIntoDb(data);
            })
          }
        });
      }
    }
  }
  _getRequestOptions() {
    return Object.assign({
      jar: this.cookieJar
    }, config.httpOptions);
  }
  _scrapeItemDetails(url) {
    var defer = q.defer();
    request.get(url, this._getRequestOptions(), (error, response, body) => {
      if(error) {
        console.error("error while scraping item details", url, error);
      }else{
        var result = {};

        // latitude + longitude
        var latitude = body.match(/gmap_mitte_lat\s*=\s*"([0-9\.]*)/)[1];
        result.latitude = parseFloat(latitude);
        var longitude = body.match(/gmap_mitte_lng\s*=\s*"([0-9\.]*)/)[1];
        result.longitude = parseFloat(longitude);

        // alle Kosten
        var $ = cheerio.load(body);
        var kosten = $('.headline-detailed-view-panel-title:contains("Kosten")+table');
        var miete = kosten.find("td:contains('Miete')+td").text().trim().replace('€', '');
        var nebenkosten = kosten.find("td:contains('Nebenkosten')+td").text().trim().replace('€', '');
        var sonstigeKosten = kosten.find("td:contains('Sonstige Kosten')+td").text().trim().replace('€', '');
        var kaution = kosten.find("td:contains('Kaution')+td").text().trim().replace('€', '');
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
        result.data = {
          miete: miete,
          nebenkosten: nebenkosten,
          sonstigeKosten: sonstigeKosten,
          kaution: kaution
        }

        // Adresse: TODO

        defer.resolve(result);
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
        $("#table-compact-list tbody tr").each((index, element) => {
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