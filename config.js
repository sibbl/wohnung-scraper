module.exports = {
  map: {
    initialView: {
      lat: 52.504703,
      lng: 13.324861,
      zoom: 12,
    },
  },
  bots: [
    {
      id: "telegram",
      enabled: true,
      key: "249641867:AAEHJa0zlkeX1vUsY922SZKJ9J4lZUlT5Qg",
      chats: ["-165642407"],
    }
  ],
  transportRoutes: {
    hpi: {
      label: "HPI",
      name: "S Griebnitzsee Bhf",
      id: "A=1@O=S Griebnitzsee Bhf@X=13128916@Y=52393987@U=86@L=009230003@B=1@V=3.9,@p=1472124910@",
    },
    zoo: {
      label: "Zoo",
      name: "S+U Zoologischer Garten Bhf (Berlin)",
      id: "A=1@O=S+U Zoologischer Garten Bhf (Berlin)@X=13332710@Y=52506918@U=86@L=009023201@B=1@V=3.9,@p=1472124910@",
    },
  },
  dataFilter: {
    lat: 52.49281508540494,
    lng: 13.302726745605469,
    radius: 5000
  },
  dataFilterRange: {
    min: 500,
    max: 10000,
    step: 100,
    ticks: 1000,
  },
  auth: {
    username: "berlin",
    password: "291010"
  },
  defaultTransportTime: 30, // minutes
  defaultShowTransportRangeAutomatically: false,
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
        min: 2,
        max: 3
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
        max: 4
      }
    }
  },
  cronTimes: {
    scrape: '0,20,40 * * * *',
    update: '30 * * * *',
  },
  city: "Berlin",
  database: "wohnungen.db",
  geocoder: {
    provider: "here",
    // provider: "google",
    options: {
      google: {
        apiKey: "AIzaSyAmc3ExA9-AzPK9tvh9R8MeiGyVgosEqLU",
        // apiKey: "AIzaSyD5FHeDK6vsPXFmP9kTszJ-crNVHBcRRWY"
        language: "de-DE",
        region: ".de",
      },
      here: {
        appId: "BT0jwU7AVBMfVUSYqWtH",
        appCode: "DrfYGlwmrHeQMEq04E-1DA"
      },
      mapquest: {
        apiKey: "a1rKn8hjtNNVtVLBu2b9jEMQGjjUGIbJ"
      }
    }
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
      maxPages: 10
    },
    immonet: {
      name: "immonet.de",
      url: "http://www.immonet.de/immobiliensuche/sel.do?marketingtype=2&city=87372&parentcat=1&suchart=2&radius=0&listsize=25&objecttype=1&pageoffset=1&sortby=19",
      maxPages: 5
    }
  }
}