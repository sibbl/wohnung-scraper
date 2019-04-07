var AbstractScraper = require("./AbstractScraper"),
    config = require("../config"),
    request = require("request-promise"),
    cheerio = require("cheerio"),
    urlLib = require("url"),
    moment = require("moment");

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
        return trElement.find('img[alt="Tauschangebot"]').length > 0;
    }
    _getNextPage(url, $) {
        const bottomPagination = $("#main_column .pagination-bottom-wrapper");
        const nextLink = $("ul li a:contains('»')", bottomPagination);
        if (nextLink.length > 0) {
            return urlLib.resolve(url, nextLink.attr("href"));
        } else {
            return false;
        }
    }
    async _getDbObject(url, tableRow, itemId, exists) {
        const miete = tableRow
            .find(".ang_spalte_miete")
            .text()
            .trim()
            .replace("€", "");
        const zimmer = tableRow
            .find(".ang_spalte_zimmer")
            .text()
            .trim();
        const freiab_str = tableRow
            .find(".ang_spalte_freiab")
            .text()
            .trim();
        let freiab;
        if (freiab_str.indexOf("sofort") >= 0) {
            freiab = moment();
        } else {
            freiab = moment(freiab_str, "DD.MM.YYYY");
        }
        const groesse = tableRow
            .find(".ang_spalte_groesse")
            .text()
            .trim()
            .replace("m²", "");
        const relativeItemUrl = tableRow.attr("adid");
        const itemUrl = urlLib.resolve(url, relativeItemUrl);

        const data = await this.scrapeItemDetails(itemUrl, exists);
        data.websiteId = itemId;
        data.rooms = parseInt(zimmer);
        data.size = parseInt(groesse);
        data.price = parseInt(miete);
        data.url = itemUrl;
        data.free_from = freiab.toISOString();
        data.active = true;
        return data;
    }
    async _scrapeItem(url, tableRow) {
        const relativeItemUrl = tableRow.attr("adid");
        const urlParts = relativeItemUrl.match(/[^\.]+\.([0-9]+)\.html/);
        if (urlParts == null || urlParts.length < 2) {
            return false;
        }
        const itemId = urlParts[1];
        const freiBis = tableRow
            .find(".ang_spalte_freibis")
            .text()
            .trim();
        const isInDb = await this.hasItemInDb(itemId);
        var ignore =
            this._isTagesmiete(tableRow) ||
            this._isTauschangebot(tableRow) ||
            this._isTeaser(tableRow) ||
            freiBis.length > 0;
        if (ignore) {
            if (isInDb) {
                await this.removeFromDb(itemId);
                return true;
            } else {
                return false;
            }
        } else if (this._isVermietet(tableRow)) {
            if (isInDb) {
                const data = await this._getDbObject(
                    url,
                    tableRow,
                    itemId,
                    true
                );
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
            ...config.httpOptions
        };
    }
    async scrapeItemDetails(url, exists) {
        const { body, statusCode } = await this.doRequest(
          url,
          request.get(url, this._getRequestOptions())
        );

        const result = {};
        result.gone = statusCode !== 200;
        try {
            // latitude + longitude
            const latLngParts = body.match(
                /"lat":\s*([0-9\.]+),\s*"lng":\s*([0-9\.]+)/
            );
            if (latLngParts) {
                result.latitude = parseFloat(latLngParts[1]);
                result.longitude = parseFloat(latLngParts[2]);
            } else {
                result.latitude = NaN;
                result.longitude = NaN;
            }

            const $ = cheerio.load(body);

            // alle Kosten
            let kosten = $(
                '.headline-detailed-view-panel-title:contains("Kosten")+table'
            );
            let miete = kosten
                .find("td:contains('Miete')+td")
                .text()
                .trim()
                .replace("€", "");
            let nebenkosten = kosten
                .find("td:contains('Nebenkosten')+td")
                .text()
                .trim()
                .replace("€", "");
            let sonstigeKosten = kosten
                .find("td:contains('Sonstige Kosten')+td")
                .text()
                .trim()
                .replace("€", "");
            let kaution = kosten
                .find("td:contains('Kaution')+td")
                .text()
                .trim()
                .replace("€", "");
            miete = parseInt(miete);
            if (Number.isNaN(miete)) {
                miete = null;
            }
            nebenkosten = parseInt(nebenkosten);
            if (Number.isNaN(nebenkosten)) {
                nebenkosten = null;
            }
            sonstigeKosten = parseInt(sonstigeKosten);
            if (Number.isNaN(sonstigeKosten)) {
                sonstigeKosten = null;
            }
            kaution = parseInt(kaution);
            if (Number.isNaN(kaution)) {
                kaution = null;
            }

            // Adresse:
            const adresse = $(
                '.headline-detailed-view-panel-title:contains("Adresse")+a'
            )
                .text()
                .trim();

            result.data = {
                miete: miete,
                nebenkosten: nebenkosten,
                sonstigeKosten: sonstigeKosten,
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
        if (result.gone) {
            return result;
        } else {
            if (exists) {
                return result;
            } else {
                if (
                    Number.isNaN(result.latitude) ||
                    Number.isNaN(result.longitude)
                ) {
                    let resolvedAddress;
                    try {
                        resolvedAddress = await this.getLocationOfAddress(
                            result.data.adresse
                        );
                    } catch (_) {
                        return result;
                    }
                    result.latitude = resolvedAddress.latitude;
                    result.longitude = resolvedAddress.longitude;
                    return result;
                } else {
                    return result;
                }
            }
        }
    }
    async scrapeSite(url) {
        const { body } = await this.doRequest(
          url,
          request.get(url, this._getRequestOptions())
        );

        const $ = cheerio.load(body);
        const promises = [];
        $("#table-compact-list tbody tr").each((_, element) => {
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
