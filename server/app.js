const express = require("express"),
  { BUILD_DIR, PUBLIC_DIR } = require("../paths"),
  bodyParser = require("body-parser"),
  moment = require("moment"),
  basicAuth = require("basic-auth-connect"),
  geolib = require("geolib"),
  NodeGeocoder = require("node-geocoder"),
  getScraperRunner = require("./utils/scraperRunner");

module.exports = class App {
  constructor(db, scaperList, config) {
    this.db = db;
    this.config = config;
    this.app = express();
    this.port = process.env.PORT || 3001;

    this.app.use(basicAuth(config.auth.username, config.auth.password));
    this.app.use(bodyParser.json());
    this.app.use(express.static(BUILD_DIR));
    this.app.use(express.static(PUBLIC_DIR));

    const scraperRunner = getScraperRunner(scaperList);

    (async () => {
      this.statements = {
        updateActive: await db.prepare(
          'UPDATE "wohnungen" SET active = $active WHERE id = $id'
        ),
        updateFavorite: await db.prepare(
          'UPDATE "wohnungen" SET favorite = $favorite WHERE id = $id'
        ),
        updateLocation: await db.prepare(
          'UPDATE "wohnungen" SET latitude = $latitude, longitude = $longitude WHERE id = $id'
        ),
        getById: await db.prepare('SELECT * FROM "wohnungen" WHERE id = $id')
      };
    })();

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
      res.send(JSON.stringify(this.config));
    });

    this.app.get("/forward/:id", async (req, res) => {
      let row;
      try {
        row = await this.statements.getById.get({
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
        item.free_from = moment(item.free_from).toISOString();
        item.added = moment(item.added).toISOString();
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
          await this.statements.updateActive.run({
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
          await this.statements.updateFavorite.run({
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
        Object.keys(
          this.config.transportRoutes.options[
            this.config.transportRoutes.provider
          ]
        ).indexOf(req.params.direction) < 0
      ) {
        res.send("invalid param", 400);
        return;
      }
      let row;
      try {
        row = await this.statements.getById.get({
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

      const transportModule = require(`../transport/${
        this.config.transportRoutes.provider
      }`);

      await transportModule.redirectToTransport(
        row,
        req.params.direction,
        this.config,
        res
      );
    });

    this.app.post("/update/location", async (req, res) => {
      const { id, latitude, longitude } = req.body;
      if (id && latitude && longitude) {
        try {
          await this.statements.updateLocation.run({
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
      const provider = req.params.provider || this.config.geocoder.provider;
      const params = {};
      if (provider in this.config.geocoder.options) {
        params = this.config.geocoder.options[provider];
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
      const promises = toUpdate.map(obj => {
        return this.statements.updateLocation.run(obj);
      });
      await Promise.all(promises);
      res.send(log.join("<br/>"));
    });

    this.app.listen(this.port, () => {
      console.log("App listening on port " + this.port);
    });
  }
};
