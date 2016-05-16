module.exports = {
  frequency: 30 * 60 * 1000, //every 30 min
  database: "wohnungen.db",
  httpOptions: {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
    }
  },
  scraper: {
    wgGesucht: {
      url: "http://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.0.0.html",
      maxPages: 5
    }
  }
}