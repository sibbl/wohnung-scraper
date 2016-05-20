module.exports = {
  cronTime: '0,30 * * * *',
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
      url: "http://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.0.0.html",
      maxPages: 5
    },
    studentenWg: {
      url: "https://www.studenten-wg.de/angebote_lesen.html?preismode=2&newsort=&stadt=Berlin&fuer=Wohnungen&mietart=1&zimin=2&zimax=4&lmode=2&proseite=50",
      maxPages: 5
    }
  }
}