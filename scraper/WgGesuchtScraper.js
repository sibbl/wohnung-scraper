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
    const nextLink = $("ul li:last-child a", bottomPagination);
    if(nextLink.text().indexOf("»") >= 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    }else{
      return false;
    }
  }
  _scrapeItem(url, tableRow) {
    if(this._isTagesmiete(tableRow)) {
      console.log("skip... Tagesmiete");
    }else if(this._isVermietet(tableRow)) {
      console.log("skip... vermietet");
    }else if(this._isTauschangebot(tableRow)) {
      console.log("skip... Tauschangebot");
    }else if(this._isTeaser(tableRow)) {
      console.log("skip... Teaser");
    }else{
      const freiBis = tableRow.find(".ang_spalte_freibis").text().trim();
      if(freiBis.length > 0) {
        console.log("skip... befristet");
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
          console.log("has item?", itemId, hasItem);
          if(!hasItem) {
            this._scrapeItemDetails(itemUrl).then(data => {
              console.log("got details", itemId, data);
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
  _scrapeItemDetails(url) {
    var defer = q.defer();
    console.log("scrape details");
    request.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
      }
    }, (error, response, body) => {
      if(error) {
        console.error("error while scraping item details", url, error);
      }else{
        var result = {};
        //TODO: parse from body
        //fill result.data with specific data like description etc.
        //fill result.latitude + result.longitude with geolocation (floats!)
        defer.resolve(result);
      }
    });
    return defer.promise;
  }
  _scrapeSite(url) {
    request.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
      }
    }, (error, response, body) => {
      if(error) {
        console.error("Error while getting URL", this.id);
      }else{
        const $ = cheerio.load(body);
        $("#table-compact-list tbody tr").each((index, element) => {
          this._scrapeItem(url, $(element));
        });
        const nextPageUrl = this._getNextPage(url, $);
        // if(nextPageUrl !== false) {
        //   this._scrapeSite(url);
        // }
      }
    });
  }
  scrape() {
    this._scrapeSite(this.config.url);
  };
}