var AbstractScraper = require("./AbstractScraper"),
  request = require("request-promise"),
  moment = require("moment");

module.exports = class ImmoscoutApiScraper extends AbstractScraper {
  constructor(db, globalConfig) {
    super(db, globalConfig, "immoscout24api");
  }

  async _getDbObject(itemId, exists) {
    const itemUrl = `https://rest.immobilienscout24.de/restapi/api/search/v1.0/expose/${itemId}?features=adKeysAndStringValues,virtualTour,unpublishedExposes,referencePriceV3,calculatedTotalRent,listFirstListing&referrer=lastsearch_homescreen`;
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
    return {
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        accept: "application/json",
        "user-agent": this.config.userAgent,
        authorization: this.authorizationValue
      }
    };
  }

  async beforeUpdateItems() {
    await this._authenticate();
  }

  async scrapeItemDetails(url, exists) {
    const response = await this.doRequest(
      url,
      fetch(url, this._getAuthenticatedRequestOptions())
    );

    const json = await response.json();
    const expose = json["expose.expose"];

    const result = {};

    result.gone =
      response.status !== 200 ||
      expose.publicationState.deactivated !== "false";
    if (result.gone) {
      if (result.removed == null) {
        result.removed = new Date();
      }
      return result;
    }
    try {
      result.title = expose.realEstate.title;
      result.size = expose.realEstate.livingSpace;
      result.rooms = expose.realEstate.numberOfRooms;

      result.data = {};
      result.data.publicUrl = `https://www.immobilienscout24.de/expose/${expose["@id"]}`;
      result.data.kaltmiete = expose.realEstate.baseRent;
      result.data.warmmiete = expose.realEstate.totalRent;
      result.data.nebenkosten = expose.realEstate.parkingSpacePrice;
      result.data.heizkosten = expose.realEstate.serviceCharge;
      result.data.betriebskosten = 0; // expose.realEstate.serviceCharge; // ???

      let warmmiete = result.data.warmmiete;
      if (Number.isNaN(warmmiete)) {
        warmmiete = result.data.kaltmiete;
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

      result.price = warmmiete;

      const address = expose.realEstate.address;
      if (address && address.wgs84Coordinate) {
        result.latitude = address.wgs84Coordinate.latitude;
        result.longitude = address.wgs84Coordinate.longitude;
      }

      if (address) {
        result.data.adresse =
          `${address.street} ${address.houseNumber}, ${address.postcode} ${address.city} ${address.quarter}`.trim();
      }

      let freeFrom;
      const freeFromStr = expose.realEstate.freeFrom;
      if (freeFromStr === "sofort" || freeFromStr === "bezugsfrei" || freeFromStr === undefined) {
        freeFrom = moment();
      } else {
        freeFrom = moment(freeFromStr, "DD.MM.YYYY");
      }
      result.free_from = freeFrom.toISOString();

      const features = this._aggregateFeatures(expose.realEstate, [
        "floorplan",
        "lift",
        "floor",
        "numberOfFloors",
        "cellar",
        "constructionYear",
        "heatingTypeEnev2014",
        "thermalCharacteristic",
        "usableFloorSpace",
        "balcony",
        "builtInKitchen",
        "garden",
        "parkingSpacePrice",
        "deposit",
        "parkingSpaceType",
        "petsAllowed"
      ]);
      result.data.features = features;
      result.data.description = [
        expose.realEstate.descriptionNote,
        expose.realEstate.furnishingNote,
        expose.realEstate.otherNote
      ]
        .filter((x) => x)
        .join("\n");
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

  _aggregateFeatures(obj, featureKeys) {
    const result = {};
    for (let key of featureKeys) {
      const value = obj[key];
      if (value === undefined) continue;
      if (value === false || value === "NOT_APPLICABLE" || value === "false") {
        result[key] = false;
      } else if (value === true || value === "true") {
        result[key] = true;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async _authenticate() {
    const url = `https://publicauth.immobilienscout24.de/oauth/token?grant_type=client_credentials&client_id=${this.config.clientId}&client_secret=${this.config.clientSecret}`;
    const response = await this.doRequest(url, fetch(url, { method: "POST" }));
    const json = await response.json();
    if (!json.token_type || !json.access_token)
      throw new Error("Failed to get access token");
    this.authorizationValue = `${json.token_type} ${json.access_token}`;
  }
  async scrapeSite(url) {
    await this._authenticate();

    const allPageResults = [];
    // TODO: use https://api.mobile.immobilienscout24.de/home/search/total with publishedafter to only fetch differences?
    for (let i = 1; i <= this.config.maxPages; i++) {
      const results = await this._scrapeSiteWithPageNumber(url, i);
      allPageResults.push(results);
    }
    return allPageResults;
  }
  async _scrapeSiteWithPageNumber(url, pageNumber) {
    const fullUrl = `${url}&pagenumber=${pageNumber}`;
    const response = await this.doRequest(
      fullUrl,
      fetch(fullUrl, this._getAuthenticatedRequestOptions())
    );

    const json = await response.json();
    const results = [];
    for (const item of json.results) {
      const result = await this._scrapeItem(item);
      results.push(result);
    }
    return results;
  }
};
