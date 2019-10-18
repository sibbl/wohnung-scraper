const { DateTime } = require("luxon");

const mapBoxConfig = {
  apiKey: "<mapbox key>"
};

module.exports = async () => {
  const NextBike = require("./map-content/overlays/nextbike");
  const OsmOverpass = require("./map-content/overlays/osm-overpass");

  const mapOverlays = (await Promise.all([
    // NextBike.getFlexZoneGeoJsonAsync({
    //   cityName: "Leipzig",
    //   domain: "le"
    // }),
    NextBike.getStationsGeoJsonAsync({
      cityName: "Berlin",
      cityId: 362 // see https://github.com/syssi/nextbike
    }),
    OsmOverpass.executeQueryAsync({
      name: "Drink Water",
      query: `node [amenity=drinking_water](around:10000,52.504703,13.324861);`
    }),
    OsmOverpass.executeQueryAsync({
      name: "Supermarkets & general shops",
      query: `(
          node [shop=supermarket](around:5000,52.504703,13.324861);
          node [shop=general](around:5000,52.504703,13.324861);
        );`
    })
  ])).filter(o => o);
  return {
    baseUrl: "http://localhost:3000/",
    map: {
      initialView: {
        lat: 52.504703,
        lng: 13.324861,
        zoom: 12
      },
      layers: [
        require("./map-content/layers/openstreetmap").Default,
        require("./map-content/layers/memomaps-publictransport").Default,
        require("./map-content/layers/stamen").Default,
        require("./map-content/layers/cities/Berlin/morgenpost-noise")(
          mapBoxConfig
        ).Default,
        ...Object.values(require("./map-content/layers/mapbox")(mapBoxConfig))
      ],
      overlays: mapOverlays
    },
    bots: [
      {
        id: "telegram",
        enabled: false,
        key: "<telegram-bot-key>",
        chats: ["<telegram-chat-id>"]
      }
    ],
    transportRoutes: {
      provider: "berlin_vbb",
      options: {
        berlin_vbb: {
          zoo: {
            label: "Zoo",
            name: "S+U Zoologischer Garten Bhf (Berlin)",
            id:
              "A=1@O=S+U Zoologischer Garten Bhf (Berlin)@X=13332710@Y=52506918@U=86@L=009023201@B=1@V=3.9,@p=1472124910@"
          }
        }
      }
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
      ticks: 1000
    },
    auth: {
      username: "<USERNAME>",
      password: "<PASSWORD>"
    },
    transportTimeMapnificentConfig: {
      // please find supported cities over at https://github.com/mapnificent/mapnificent_cities
      cityid: "berlin"
    },
    defaultTransportTime: 30, // minutes
    defaultShowTransportRangeAutomatically: false,
    pricePerSqM: {
      min: 8, // will be colored green
      max: 20 // will be colored red
    },
    filters: {
      // limits - defines start and end of filter range slider domain
      limits: {
        price: {
          min: 0,
          max: 1600
        },
        rooms: {
          min: 1,
          max: 10
        },
        size: {
          min: 0,
          max: 200
        },
        free_from: {
          min: "now",
          max: DateTime.local()
            .startOf("month")
            .plus({ months: 6 })
            .toISODate()
        },
        age: {
          min: DateTime.local()
            .startOf("month")
            .plus({ months: -6 })
            .toISODate(),
          max: "now"
        }
      },
      // default - defines default values for the filters range sliders
      default: {
        hideInactive: true,
        showOnlyFavs: false,
        price: {
          min: 0,
          max: 1200
        },
        rooms: {
          min: 3,
          max: 5
        },
        size: {
          min: 60,
          max: 160
        },
        free_from: {
          min: "now",
          max: DateTime.local()
            .startOf("month")
            .plus({ months: 3 })
            .toISODate()
        },
        age: {
          min: DateTime.local()
            .startOf("month")
            .plus({ months: -3 })
            .toISODate(),
          max: "now"
        }
      }
    },
    cronTimes: {
      scrape: "0,20,45 * * * *",
      update: "30 * * * *"
    },
    city: "Berlin",
    database: "data/wohnungen.db",
    geocoder: {
      provider: "here", //supported: here, google, mapquest
      options: {
        google: {
          apiKey: "<google-maps-api-key>",
          language: "de-DE",
          region: ".de"
        },
        here: {
          appId: "<here-api-app-id>",
          appCode: "<here-api-app-code>"
        },
        mapquest: {
          apiKey: "<mapquest-api-key>"
        }
      }
    },
    httpOptions: {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
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
        url: "https://www.studenten-wg.de/angebote_lesen.html?stadt=Berlin",
        maxPages: 5
      },
      immoscout24: {
        name: "immobilienscout24.de",
        url:
          "https://www.immobilienscout24.de/Suche/S-2/Wohnung-Miete/Berlin/Berlin/-/-/-/-/-/-/false",
        maxPages: 10
      },
      immonet: {
        name: "immonet.de",
        url:
          "https://www.immonet.de/immobiliensuche/sel.do?city=87372&sortby=19",
        maxPages: 5
      }
    }
  };
};
