var express = require("express"),
  bodyParser = require("body-parser"),
  moment = require("moment"),
  config = require("../config.js"),
  basicAuth = require("basic-auth-connect"),
  geolib = require("geolib"),
  NodeGeocoder = require("node-geocoder"),
  request = require("request-promise"),
  getScraperRunner = require("../utils/scraperRunner");

module.exports = class App {
  constructor(db, scaperList) {
    this.db = db;
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.app.use(basicAuth(config.auth.username, config.auth.password));
    this.app.use(express.static("./app/public"));
    this.app.use(bodyParser.json());

    const scraperRunner = getScraperRunner(scaperList);

    this.app.get("/scrape", async (_, res) => {
      try {
        await scraperRunner("scrape");
      } catch (error) {
        res.send(JSON.stringify({ status: "error", error }));
        return;
      }
      res.send(JSON.stringify({ status: "ok" }));
    });

    this.app.get("/update", async (_, res) => {
      try {
        await scraperRunner("updateItems");
      } catch (error) {
        res.send(JSON.stringify({ status: "error", error }));
        return;
      }
      res.send(JSON.stringify({ status: "ok" }));
    });

    this.app.get("/config", (_, res) => {
      res.send("window.appConfig = " + JSON.stringify(config) + ";");
    });

    this.app.get("/forward/:id", async (req, res) => {
      let row;
      try {
        row = await db
          .prepare('SELECT url FROM "wohnungen" WHERE id = $id')
          .get({
            $id: req.params.id
          });
      } catch (error) {
        res.send(
          JSON.stringify({
            success: false,
            message: "database error",
            details: error
          }),
          500
        );
        return;
      }
      if (row == undefined) {
        res.send("invalid ID", 404);
      } else {
        res.writeHead(301, { Location: row.url });
        res.end();
      }
    });

    this.app.get("/data", async (req, res) => {
      var query;
      if (req.query.all == undefined) {
        query =
          'SELECT * FROM "wohnungen" WHERE gone = 0 AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY added DESC';
      } else {
        query = 'SELECT * FROM "wohnungen" ORDER BY added DESC';
      }
      let result;
      try {
        result = await db.all(query);
      } catch (error) {
        res.send(JSON.stringify(error));
        return;
      }

      const now = moment();

      let resultArr = result.map(item => {
        //convert back to boolean
        ["favorite", "gone", "active"].forEach(
          name => (item[name] = item[name] == 1)
        );
        //parse JSON string
        item.data = JSON.parse(item.data);
        //set age
        item.age = now.diff(moment(item.added), "days");
        return item;
      });
      // filter by center coordinate & radius
      if (
        req.query.lat != undefined &&
        req.query.lng != undefined &&
        req.query.radius != undefined
      ) {
        const filterCenter = {
          latitude: req.query.lat,
          longitude: req.query.lng
        };
        resultArr = resultArr.filter(item => {
          return geolib.getDistance(item, filterCenter) <= req.query.radius;
        });
      }
      const resultObj = resultArr.reduce((obj, item) => {
        obj[item.id] = item;
        return obj;
      }, {});
      res.send(JSON.stringify(resultObj));
    });

    this.app.get("/reset", async (_, res) => {
      try {
        await db.run('DELETE FROM "wohnungen"');
      } catch (error) {
        res.send(JSON.stringify({ status: "error", error }));
        return;
      }
      res.send(
        JSON.stringify({
          status: "ok"
        })
      );
    });

    this.app.post("/:id/active", async (req, res) => {
      const active = req.body.active;
      if (typeof active !== "boolean") {
        res.send(JSON.stringify({ success: false, message: "missing body" }));
      } else {
        try {
          await db
            .prepare('UPDATE "wohnungen" SET active = $active WHERE id = $id')
            .run({
              $active: active,
              $id: req.params.id
            });
        } catch (error) {
          res.send(
            JSON.stringify({
              success: false,
              message: "database error",
              details: error
            })
          );
          return;
        }
        res.send(JSON.stringify({ success: true }));
      }
    });

    this.app.post("/:id/favorite", async (req, res) => {
      const favorite = req.body.favorite;
      if (typeof favorite !== "boolean") {
        res.send(JSON.stringify({ success: false, message: "missing body" }));
      } else {
        try {
          await db
            .prepare(
              'UPDATE "wohnungen" SET favorite = $favorite WHERE id = $id'
            )
            .run({
              $favorite: favorite,
              $id: req.params.id
            });
        } catch (error) {
          res.send(
            JSON.stringify({
              success: false,
              message: "database error",
              details: error
            })
          );
          return;
        }
        res.send(JSON.stringify({ success: true }));
      }
    });

    this.app.get("/:id/route/:direction", async (req, res) => {
      if (
        Object.keys(config.transportRoutes).indexOf(req.params.direction) < 0
      ) {
        res.send("invalid param", 400);
        return;
      }
      const transportData = config.transportRoutes[req.params.direction];
      let row;
      try {
        row = await db
          .prepare(
            'SELECT data, latitude, longitude FROM "wohnungen" WHERE id = $id'
          )
          .get({
            $id: req.params.id
          });
      } catch (error) {
        res.send(
          JSON.stringify({
            success: false,
            message: "database error",
            details: error
          }),
          500
        );
        return;
      }

      if (row == undefined) {
        res.send("invalid ID", 400);
        return;
      }
      const data = JSON.parse(row.data);

      const forward = async adr => {
        const name = encodeURIComponent(adr);

        const url = `http://fahrinfo.vbb.de/bin/ajax-getstop.exe/dny?start=1&tpl=suggest2json&REQ0JourneyStopsS0A=7&getstop=1&noSession=yes&REQ0JourneyStopsS0F=excludeStationAttribute;FO&REQ0JourneyStopsB=12&REQ0JourneyStopsS0G=${name}&js=true&`;
        const body = await request.get(url);

        const firstEqualSign = body.indexOf("=");
        const firstSemicolon = body.indexOf(";");
        const json = JSON.parse(
          body.substr(firstEqualSign + 1, firstSemicolon - firstEqualSign - 1)
        );
        const startName = json.suggestions[0].value;
        const startId = json.suggestions[0].id;

        const endName = transportData.name;
        const endId = transportData.id;
        const str = `<!DOCTYPE html>
            <html>
            <body></body>
            <script>
            var form = document.createElement("form");
            form.setAttribute("method", "post");
            form.setAttribute("action", "http://fahrinfo.vbb.de/bin/query.exe/dn");
            var createInputField = function(name, input) {
              var hiddenField = document.createElement("input");              
              hiddenField.setAttribute("name", name);
              hiddenField.setAttribute("type", "hidden");
              hiddenField.setAttribute("value", input);
              form.appendChild(hiddenField);
            }
            createInputField("start","yes");
            createInputField("REQ0JourneyStopsS0A",2);
            createInputField("ignoreTypeCheck", "yes");
            createInputField("S", "${startName}");
            createInputField("REQ0JourneyStopsSID","${startId}");
            // createInputField("REQ0JourneyStopsZ0A", "1");
            createInputField("Z", "${endName}");
            createInputField("REQ0JourneyStopsZID", "${endId}");
            createInputField("time", "10:00");
            createInputField("date", "10.10.2016");
            createInputField("timeSel", "depart");
            // createInputField("route_search_now_submit", "");
            document.body.appendChild(form);
            form.submit();
            </script>
            </html>`;
        res.set("Content-Type", "text/html");
        res.send(str);
      };

      const adr = data.adresse;
      if (adr.length == 0) {
        if (row.longitude && row.latitude) {
          //reverse geoencode
          const provider = req.params.provider || config.geocoder.provider;
          const params = {};
          if (provider in config.geocoder.options) {
            params = config.geocoder.options[provider];
          }
          params.provider = provider;
          const geocoder = NodeGeocoder(params);
          let res;
          try {
            res = await geocoder.reverse({
              lat: row.latitude,
              lon: row.longitude
            });
          } catch (error) {
            res.send("error: " + JSON.stringify(err), 500);
            return;
          }

          const adrArr = res[0];
          const adrParts = [];
          for (let i in adrArr) {
            adrParts.push(adrArr[i]);
          }
          await forward(adrParts.join(" "));
        } else {
          res.send("no address found", 404);
        }
      } else {
        await forward(adr);
      }
    });

    this.app.post("/update/location", async (req, res) => {
      const { id, latitude, longitude } = req.body;
      if (id && latitude && longitude) {
        try {
          await db
            .prepare(
              'UPDATE "wohnungen" SET latitude = $latitude, longitude = $longitude WHERE id = $id'
            )
            .run({
              $id: id,
              $latitude: latitude,
              $longitude: longitude
            });
        } catch (error) {
          res.send(JSON.stringify({ success: false, error }), 500);
          return;
        }

        res.send(JSON.stringify({ success: true }), 200);
      } else {
        res.send(
          JSON.stringify({ success: false, error: "missing params" }),
          400
        );
      }
    });

    this.app.get("/geocode/:provider", async (req, res) => {
      let result;
      try {
        result = await db.all(
          'SELECT * from "wohnungen" WHERE latitude IS NULL OR longitude IS NULL'
        );
      } catch (error) {
        res.send(JSON.stringify(error), 500);
        return;
      }
      const addresses = [];
      const nonEmptyResults = [];
      for (let i = 0; i < result.length; i++) {
        const data = JSON.parse(result[i].data);
        if (data != null && data.adresse != null) {
          let adr = data.adresse.replace(/ *\([^)]*\) */g, "");
          if (adr.length > 0) {
            nonEmptyResults.push(result[i]);
            addresses.push(adr);
          }
        }
      }
      if (nonEmptyResults.length == 0) {
        res.send("No missing latlng found.");
        return;
      }
      const provider = req.params.provider || config.geocoder.provider;
      const params = {};
      if (provider in config.geocoder.options) {
        params = config.geocoder.options[provider];
      }
      params.provider = provider;
      const geocoder = NodeGeocoder(params);
      let geoResults;
      try {
        geoResults = geocoder.batchGeocode(addresses);
      } catch (error) {
        res.send(JSON.stringify(geoError), 500);
        return;
      }
      const log = [],
        toUpdate = [];
      for (let i = 0; i < geoResults.length; i++) {
        const geoRes = geoResults[i];
        const isError = geoRes.error != null || geoRes.value.length < 1;
        if (isError) {
          log.push(
            `ERROR: ${addresses[i]} -- ${geoRes.error} <a href='${
              nonEmptyResults[i].url
            }'>Link</a>`
          );
        } else {
          const val = geoRes.value[0];
          const str = Object.keys(val)
            .filter(key => {
              if (["latitude", "longitude", "provider"].indexOf(key) >= 0) {
                return false;
              }
              return val[key] != null && val[key] != undefined;
            })
            .map(key => val[key])
            .join(" ");
          if (str.indexOf("Berlin") < 0) {
            log.push(`WHAT?! ${addresses[i]} -- ${str}`);
          } else {
            log.push(`<strong>FOUND:</strong> ${addresses[i]}-- ${str}`);
            toUpdate.push({
              $id: nonEmptyResults[i].id,
              $latitude: val.latitude,
              $longitude: val.longitude
            });
          }
        }
      }
      const stmt = db.prepare(
        'UPDATE "wohnungen" SET latitude = $latitude, longitude = $longitude WHERE id = $id'
      );
      const promises = toUpdate.map(obj => {
        return stmt.run(obj);
      });
      await Promise.all(promises);
      res.send(log.join("<br/>"));
    });

    this.app.listen(this.port, () => {
      console.log("App listening on port " + this.port);
    });
  }
};
