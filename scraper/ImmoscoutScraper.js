var AbstractScraper = require("./AbstractScraper"),
  { chromium } = require("playwright-extra"),
  StealthPlugin = require("puppeteer-extra-plugin-stealth"),
  RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha"),
  cheerio = require("cheerio"),
  urlLib = require("url"),
  moment = require("moment");

chromium.use(StealthPlugin());
chromium.use(
  RecaptchaPlugin({
    visualFeedback: true
    // provider: {
    //   id: "2captcha",
    //   token: "XXXXXXX"
    // }
  })
);

async function waitFor(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

module.exports = class ImmoscoutScraper extends AbstractScraper {
  constructor(db, globalConfig) {
    super(db, globalConfig, "immoscout24");
  }
  _getNextPage(url, $) {
    const nextLink = $("#listContainer a[data-is24-qa='paging_bottom_next']");
    if (nextLink.length > 0) {
      return urlLib.resolve(url, nextLink.attr("href"));
    } else {
      return false;
    }
  }
  async _getDbObject(browser, url, tableRow, itemId, relativeItemUrl, exists) {
    const itemUrl = urlLib.resolve(url, relativeItemUrl);

    let data = {};
    try {
      data = await this.scrapeItemDetails(browser, itemUrl, exists);
    } catch (e) {
      console.log("Error whilte scrapping immoscout24 item", e);
    }

    const rawTitle = tableRow
      .find(".result-list-entry__brand-title")
      .text()
      .trim();
    const title = rawTitle.startsWith("NEU")
      ? rawTitle.substr(3).trim()
      : rawTitle;

    data.title = title;
    data.url = itemUrl;
    data.websiteId = itemId;
    data.active = true;

    return data;
  }
  async _scrapeItem(browser, url, tableRow) {
    const linkElem = tableRow.find(".result-list-entry__brand-title-container");
    const relativeItemUrl = linkElem.attr("href");

    let itemId = null;
    if (typeof relativeItemUrl !== "undefined") {
      const urlParts = relativeItemUrl.match(/[0-9]+$/);
      if (urlParts != null && urlParts.length > 0) {
        itemId = urlParts[0];
      } else {
        console.error(
          "[" + this.id + "] Scraping the following URL isn't supported: ",
          relativeItemUrl
        );
      }
    }
    if (itemId == null) {
      return false;
    }

    const isInDb = await this.hasItemInDb(itemId);
    if (isInDb) {
      const data = await this._getDbObject(
        browser,
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
        browser,
        url,
        tableRow,
        itemId,
        relativeItemUrl
      );
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
      resolveWithFullResponse: true,
      jar: this.cookieJar,
      ...this.globalConfig.httpOptions
    };
  }
  async getItemHtmlContent(browser, url) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("h1#expose-title");
    const body = await page.content();
    await page.close();
    return { body };
  }
  async scrapeItemDetails(browser, url, exists) {
    const { body } = await this.doRequest(
      url,
      this.getItemHtmlContent(browser, url)
    );

    const result = {};
    result.data = {};
    result.gone =
      body.includes("Angebot wurde deaktiviert") ||
      body.includes("Angebot liegt im Archiv");
    if (!result.gone) {
      try {
        const $ = cheerio.load(body);
        const getNumericValue = (selector) => {
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
        const getStrValue = (selector) => {
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
      }
    }
    if (result.gone) {
      if (result.removed == null) {
        result.removed = new Date();
      }
      return result;
    } else {
      if (exists) {
        return result;
      } else {
        let resolvedAddress;
        var latLngMatch = body.match(
          /lat:\s*([0-9]+\.[0-9]+)[\s\S]+lng:\s*([0-9]+\.[0-9]+)/
        );

        if (latLngMatch && latLngMatch.length == 3) {
          resolvedAddress = {
            latitude: parseFloat(latLngMatch[1]),
            longitude: parseFloat(latLngMatch[2])
          };
        } else {
          try {
            resolvedAddress = await this.getLocationOfAddress(
              result.data.adresse
            );
          } catch (_) {
            return result;
          }
        }

        result.latitude = resolvedAddress.latitude;
        result.longitude = resolvedAddress.longitude;
        return result;
      }
    }
  }

  async tryGetListHtmlContent(page, url, retries) {
    if (retries === 0) {
      throw new Error("too many tries");
    }

    // TODO: localize
    const botMessage = page.locator(
      "text=Entschuldige bitte, dann hat unser System dich fälschlicherweise als Roboter identifiziert."
    );
    // TODO: localize
    const captchaButton = page.locator('[aria-label="Klicken zum Überprüfen"]');
    const resultListHeader = page.locator("h1.resultListHeadline");

    const waitForBotMessage = botMessage.waitFor();
    const waitForCaptchaButton = captchaButton.waitFor();
    const waitForResultListHeader = resultListHeader.waitFor();

    const fastestPromise = await Promise.race([
      waitForBotMessage,
      waitForCaptchaButton,
      waitForResultListHeader
    ]);
    await waitFor(2000);
    const captchaVisible = await captchaButton.isVisible();
    const resultListVisible = await resultListHeader.isVisible();

    // success case:
    if (fastestPromise === waitForResultListHeader || resultListVisible) {
      const body = await page.content();
      await page.close();
      return { body };
    }
    // captcha case if solveRecaptchas failed before
    if (fastestPromise === waitForCaptchaButton || captchaVisible) {
      await waitFor(500);
      await captchaButton.click();
      await waitFor(500);
      await page.reload();
      return await this.tryGetListHtmlContent(page, url, retries - 1);
    }
    // any other case... just reload and try again after a few seconds
    await waitFor(5000);
    await page.reload();
    await waitFor(500);
    return await this.tryGetListHtmlContent(page, url, retries - 1);
  }

  async getListHtmlContent(browser, url) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.solveRecaptchas();
    return await this.tryGetListHtmlContent(page, url, 5);
  }

  async scrapeSite(url) {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://www.immobilienscout24.de", {
      waitUntil: "networkidle"
    });
    try {
      // TODO: localize cookie button
      await page.click('text="Alle akzeptieren"', { timeout: 5000 });
    } catch {
      // ignore
    }
    return await this.scrapeSiteInternal(url, browser);
  }

  async scrapeSiteInternal(url, browser) {
    const { body } = await this.doRequest(
      url,
      this.getListHtmlContent(browser, url)
    );

    const $ = cheerio.load(body);
    const promises = [];
    $("#resultListItems .result-list__listing").each((_, element) => {
      promises.push(this._scrapeItem(browser, url, $(element)));
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
