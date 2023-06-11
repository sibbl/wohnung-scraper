var AbstractScraper = require("./AbstractScraper"),
  request = require("request-promise"),
  moment = require("moment");

module.exports = class KleinanzeigenApiScraper extends AbstractScraper {
  constructor(db, globalConfig) {
    super(db, globalConfig, "kleinanzeigenapi");
  }

  async _getDbObject(itemId, exists) {
    const itemUrl = `https://api.kleinanzeigen.de/api/ads/${itemId}.json`;
    const data = await this.scrapeItemDetails(itemUrl, exists);
    data.websiteId = itemId;
    data.url = itemUrl;
    data.active = true;
    return data;
  }

  async _scrapeItem(listItemJson) {
    const itemId = listItemJson.id;
    const isInDb = await this.hasItemInDb(itemId);

    if (isInDb) {
      // const data = await this._getDbObject(itemId, true);
      // await this.updateInDb(data);
      // return {
      //   type: "updated",
      //   data: data
      // };
      return false;
    } else {
      const data = await this._getDbObject(itemId, false);
      const { lastID } = await this.insertIntoDb(data);
      return {
        type: "added",
        id: lastID,
        data
      };
    }
  }
  _getRequestOptions() {
    return {
      ...this.globalConfig.httpOptions
    };
  }

  _getAuthenticatedRequestOptions() {
    const requestOptions = this._getRequestOptions();
    const authRaw = [this.config.username, this.config.password].join(":");
    const authBuffer = Buffer.from(authRaw, "utf-8");
    const authBase64 = authBuffer.toString("base64");
    return {
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        accept: "application/json",
        authorization: `Basic ${authBase64}`
      }
    };
  }

  _getAdAttribute(ad, name) {
    const attribute = ad.attributes.attribute.find((x) => x.name === name);
    if (!attribute) return undefined;
    const value = attribute.value[0].value;
    if (attribute.type === "DECIMAL" || attribute.type === "LONG") {
      return parseFloat(value);
    } else if (attribute.type === "BOOLEAN") {
      return value === "true";
    }
    return value; // DATE is already ISO and ENUM is already human readable
  }

  _getAdAttributes(ad, names) {
    const result = {};
    for (const name of names) {
      const nameWithoutPrefix = name.replace(/^wohnung_mieten\./, "");
      result[nameWithoutPrefix] = this._getAdAttribute(ad, name);
    }
    return result;
  }

  async scrapeItemDetails(url, exists) {
    const response = await this.doRequest(
      url,
      fetch(url, this._getAuthenticatedRequestOptions())
    );

    const json = await response.json();
    const ad =
      json["{http://www.ebayclassifiedsgroup.com/schema/ad/v1}ad"].value;
    const result = {};

    result.gone =
      response.status !== 200 ||
      !ad ||
      !ad["ad-status"] ||
      ad["ad-status"].value !== "ACTIVE";

    if (result.gone) {
      if (result.removed == null) {
        result.removed = new Date();
      }
      return result;
    }
    try {
      result.title = ad.title.value;
      result.size = this._getAdAttribute(ad, "wohnung_mieten.qm");
      result.rooms = this._getAdAttribute(ad, "wohnung_mieten.zimmer");

      result.data = {};
      result.data.publicUrl = `https://www.kleinanzeigen.de/s-anzeige/${ad.id}`;
      result.data.kaltmiete = this._getAdAttribute(
        ad,
        "wohnung_mieten.kaltmiete"
      );
      result.data.warmmiete = this._getAdAttribute(
        ad,
        "wohnung_mieten.warmmiete"
      );
      result.data.nebenkosten = this._getAdAttribute(
        ad,
        "wohnung_mieten.nebenkosten"
      );
      result.data.heizkosten = this._getAdAttribute(
        ad,
        "wohnung_mieten.heizkosten"
      );
      result.data.betriebskosten = this._getAdAttribute(
        ad,
        "wohnung_mieten.betriebskosten"
      );

      let warmmiete = result.data.warmmiete;
      if (Number.isNaN(warmmiete)) {
        warmmiete = result.data.kaltmiete || 0;
        if (!Number.isNaN(result.data.nebenkosten)) {
          warmmiete += result.data.nebenkosten;
        }
        if (!Number.isNaN(result.data.heizkosten)) {
          warmmiete += result.data.heizkosten;
        }
        if (!Number.isNaN(result.data.betriebskosten)) {
          warmmiete += result.data.betriebskosten;
        }
      }

      if (!warmmiete) {
        warmmiete = ad.price.amount.value;
      }

      result.price = warmmiete;

      const address = ad["ad-address"];
      if (address && address.latitude && address.longitude) {
        result.latitude = parseFloat(address.latitude.value);
        result.longitude = parseFloat(address.longitude.value);
      }

      if (address) {
        result.data.adresse =
          `${address.street.value}, ${address["zip-code"].value} ${address.state.value}`.trim();
      }

      let freeFrom;
      const freeFromStr = this._getAdAttribute(
        ad,
        "wohnung_mieten.verfuegbardate"
      );
      if (!freeFromStr) {
        freeFrom = moment();
      } else {
        freeFrom = moment(freeFromStr);
      }
      result.free_from = freeFrom.toISOString();

      const features = this._getAdAttributes(ad, [
        "wohnung_mieten.badezimmer",
        "wohnung_mieten.schlafzimmer",
        "wohnung_mieten.etage",
        "wohnung_mieten.balcony",
        "wohnung_mieten.bathtub",
        "wohnung_mieten.celler_loft",
        "wohnung_mieten.garage",
        "wohnung_mieten.pets_allowed",
        "wohnung_mieten.wg_possible",
        "wohnung_mieten.wohnungstyp"
      ]);
      result.data.features = features;
      result.data.description = ad.description ? ad.description.value : "";
      if (result.data.description.match(/balkon/i)) {
        result.data.features.balcony = true;
      }
      if (result.data.description.match(/(aufzug|lift)/i)) {
        result.data.features.lift = true;
      }
    } catch (ex) {
      console.log("CAUGHT error while scraping item", this.id, url, ex);
      result.gone = true;
      if (result.removed == null) {
        result.removed = new Date();
      }
    }
    return result;
  }

  async scrapeSite(url) {
    const allPageResults = [];
    for (let i = 1; i <= (this.config.maxPages || 1); i++) {
      const results = await this._scrapeSiteWithPageNumber(url, i);
      allPageResults.push(results);
    }
    return allPageResults;
  }

  async _scrapeSiteWithPageNumber(url, pageNumber) {
    const fullUrl = `${url}&page=${pageNumber}`;
    const response = await this.doRequest(
      fullUrl,
      fetch(fullUrl, this._getAuthenticatedRequestOptions())
    );

    const json = await response.json();
    const results = [];
    const items =
      json["{http://www.ebayclassifiedsgroup.com/schema/ad/v1}ads"].value.ad;
    for (const item of items) {
      const result = await this._scrapeItem(item);
      results.push(result);
    }
    return results;
  }
};
