module.exports = {
  map: {
    initialView: {
      lat: 52.504703,
      lng: 13.324861,
      zoom: 12,
    },
  },
  auth: {
    username: "berlin",
    password: "291010"
  },
  defaultTransportTime: 20, //20 min
  filters: {
    // usually, the upper bound is set automatically. But we crop them at these values
    upperLimits: {
      price: 1500,
      rooms: 5,
      size: 200,
      age: 100
    },
    default: {
      hideInactive: true,
      showOnlyFavs: false,
      price: {
        min: 0,
        max: 1200
      },
      rooms: {
        min: 0,
        max: 2
      },
      size: {
        min: 30,
        max: 120
      },
      age: {
        min: 0,
        max: 14
      },
      free_from: {
        min: 0,
        max: 8
      }
    }
  },
  cronTimes: {
    scrape: '0 * * * *',
    update: '30 * * * *',
  },
  city: "Berlin",
  database: "wohnungen.db",
  geocoder: {
    apiKey: "AIzaSyD5FHeDK6vsPXFmP9kTszJ-crNVHBcRRWY", //see https://developers.google.com/maps/documentation/geocoding/get-api-key
  },
  httpOptions: {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
    }
  },
  scraper: {
    wgGesucht: {
      name: "wg-gesucht.de",
      url: "http://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.0.0.html",
      maxPages: 5
    },
    studentenWg: {
      name: "studenten-wg.de",
      url: "https://www.studenten-wg.de/angebote_lesen.html?preismode=2&newsort=&stadt=Berlin&fuer=Wohnungen&mietart=1&zimin=2&zimax=4&lmode=2&proseite=50",
      maxPages: 5
    },
    immoscout24: {
      name: "immobilienscout24.de",
      url: "https://www.immobilienscout24.de/Suche/S-2/Wohnung-Miete/Berlin/Berlin/-/-/-/-/-/-/false",
      maxPages: 5
    }
  }
}