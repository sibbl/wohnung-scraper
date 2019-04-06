var AbstractScraper = require("./AbstractScraper"),
    config = require("../config"),
    request = require("request-promise"),
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
        const nextLink = $(
            "#listContainer a[data-is24-qa='paging_bottom_next']"
        );
        if (nextLink.length > 0) {
            return urlLib.resolve(url, nextLink.attr("href"));
        } else {
            return false;
        }
    }
    async _getDbObject(url, tableRow, itemId, relativeItemUrl, exists) {
        const itemUrl = urlLib.resolve(url, relativeItemUrl);

        const data = this.scrapeItemDetails(itemUrl, exists);
        data.url = itemUrl;
        data.websiteId = itemId;
        data.active = true;

        return data;
    }
    async _scrapeItem(url, tableRow) {
        const linkElem = tableRow.find(
            ".result-list-entry__brand-title-container"
        );
        const relativeItemUrl = linkElem.attr("href");
        let itemId = null;
        if (typeof relativeItemUrl !== "undefined") {
            const urlParts = relativeItemUrl.match(/[0-9]+$/);
            itemId = urlParts[0];
        }
        if (itemId == null) {
            return false;
        }
        const isInDb = await this.hasItemInDb(itemId);
        if (isInDb) {
            const data = await this._getDbObject(
                url,
                tableRow,
                itemId,
                relativeItemUrl,
                true
            );
            await this.updateInDb(data);
            return {
                type: "updated",
                data: data
            };
        } else {
            const data = await this._getDbObject(
                url,
                tableRow,
                itemId,
                relativeItemUrl
            );
            const id = this.insertIntoDb(data);
            return {
                type: "added",
                id: id,
                data: data
            };
        }
    }
    _getRequestOptions() {
        return {
            jar: this.cookieJar,
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
        result.data = {};
        result.gone = false;
        try {
            const $ = cheerio.load(body);
            const getNumericValue = selector => {
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
            const getStrValue = selector => {
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
            return result;
        } else {
            if (exists) {
                return result;
            } else {
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
            }
        }
    }
    async scrapeSite(url) {
        let body;
        try {
            body = request.get(url, this._getRequestOptions());
        } catch (e) {
            throw new Error(
                `Error while scraping URL "${url}" with error ${e}`
            );
        }
        const $ = cheerio.load(body);
        const promises = [];
        $("#resultListItems .result-list__listing").each((_, element) => {
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
