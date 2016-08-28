var express = require('express'),
    bodyParser = require('body-parser'),
    q = require('q'),
    moment = require('moment'),
    config = require('../config.js'),
    basicAuth = require('basic-auth-connect'),
    geolib = require('geolib'),
    NodeGeocoder = require('node-geocoder');

module.exports = class App {
  constructor(db, scraper) {
    this.db = db;
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    this.app.use(basicAuth(config.auth.username, config.auth.password));
    this.app.use(express.static('./app/public'));
    this.app.use(bodyParser.json());

    var scrapeOrUpdate = function(scraperFuncName) {
      let promise = null;
      scraper.forEach(s => {
        if(promise == null) {
          promise = s[scraperFuncName]();
        }else{
          promise = promise.then(function() {
            return q.when(s[scraperFuncName]());
          });
        }
      });
      return q.when(promise);
    }

    this.app.get('/scrape', (req, res) => {
      scrapeOrUpdate('scrape').then(() => {
        res.send(JSON.stringify({status: "ok"}));
      });
    });

    this.app.get('/update', (req, res) => {
      scrapeOrUpdate('updateItems').then(() => {
        res.send(JSON.stringify({status: "ok"}));
      });
    });

    this.app.get('/config', (req, res) => {
      res.send('window.appConfig = ' + JSON.stringify(config) + ";");
    });

    this.app.get('/forward/:id', (req, res) => {
      db
        .prepare('SELECT url FROM "wohnungen" WHERE id = $id')
        .get({
          $id: req.params.id
        }, (error, row) => {
          if(error) {
            res.send(JSON.stringify({
              success: false,
              message: 'database error',
              details: error
            }), 500);
          }else{
            if(row == undefined) {
              res.send("invalid ID", 404);
            }else{
              res.writeHead(301, { "Location": row.url });
              res.end();
            }
          }
        });
    })

    this.app.get('/data', (req, res) => {
      var query;
      if(req.query.all == undefined) {
        query = 'SELECT * FROM "wohnungen" WHERE gone = 0 AND latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY added DESC';
      }else{
        query = 'SELECT * FROM "wohnungen" ORDER BY added DESC';
      }
      db.all(query, (error, result) => {
        if(error) {
          res.send(JSON.stringify(error));
        }else{
          var now = moment();

          var resultArr = result.map(item => {
            //convert to boolena
            ["favorite", "gone", "active"].map(name => item[name] = item[name] == 1);
            //parse JSON string
            item.data = JSON.parse(item.data);
            //set age
            item.age = now.diff(moment(item.added), 'days')
            return item;
          });
          // filter by center coordinate & radius
          if(req.query.lat != undefined && req.query.lng != undefined && req.query.radius != undefined) {
            var filterCenter = {
              latitude: req.query.lat,
              longitude: req.query.lng
            }
            resultArr = resultArr.filter(item => {
              return geolib.getDistance(item, filterCenter) <= req.query.radius;
            });
          }
          var resultObj = {};
          resultArr.forEach(item => {
            resultObj[item.id] = item;
          })
          res.send(JSON.stringify(resultObj));
        }
      });
    });

    this.app.get('/reset', (req, res) => {
      db.run('DELETE FROM "wohnungen"', (error, result) => {
        res.send(JSON.stringify(error ? error : {
          status: "ok"
        }));
      });
    });

    this.app.post('/:id/active', (req, res) => {
      var active = req.body.active;
      if(typeof(active) !== "boolean") {
        res.send(JSON.stringify({success: false, message: "missing body"}));
      }else{
        db
          .prepare('UPDATE "wohnungen" SET active = $active WHERE id = $id')
          .run({
            $active: active,
            $id: req.params.id
          }, error => {
            if(error) {
              res.send(JSON.stringify({
                success: false,
                message: 'database error',
                details: error
              }));
            }else{
              res.send(JSON.stringify({success:true}));
            }
          });
      }
    })

    this.app.post('/:id/favorite', (req, res) => {
      var favorite = req.body.favorite;
      if(typeof(favorite) !== "boolean") {
        res.send(JSON.stringify({success: false, message: "missing body"}));
      }else{
        db
          .prepare('UPDATE "wohnungen" SET favorite = $favorite WHERE id = $id')
          .run({
            $favorite: favorite,
            $id: req.params.id
          }, error => {
            if(error) {
              res.send(JSON.stringify({
                success: false,
                message: 'database error',
                details: error
              }));
            }else{
              res.send(JSON.stringify({success:true}));
            }
          });
      }
    });

    this.app.get("/geocode/:provider", (req, res) => {
      db.all('SELECT * from "wohnungen" WHERE latitude IS NULL OR longitude IS NULL', (error, result) => {
        if(error) {
          res.send(JSON.stringify(error), 500);
        }else{
          var addresses = [];
          var nonEmptyResults = [];
          for(var i = 0; i < result.length; i++) {
            var data = JSON.parse(result[i].data);
            if(data != null && data.adresse != null) {
              var adr = data.adresse.replace(/ *\([^)]*\) */g, "");
              if(adr.length > 0) {
                nonEmptyResults.push(result[i]);
                addresses.push(adr);
              }
            }
          }
          if(nonEmptyResults.length == 0) {
            res.send("No missing latlng found.");
            return;
          }
          var provider = req.params.provider || config.geocoder.provider;
          var params = {};
          if(provider in config.geocoder.options) {
            params = config.geocoder.options[provider];
          }
          params.provider = provider;
          var geocoder = NodeGeocoder(params);
          geocoder.batchGeocode(addresses, (geoError, geoResults) => {
            if(geoError) {
              res.send(JSON.stringify(geoError), 500);
            }else{
              var log = [], toUpdate = [];
              for(var i = 0; i < geoResults.length; i++) {
                var geoRes = geoResults[i];
                var isError = geoRes.error != null || geoRes.value.length < 1;
                if(isError) {
                  log.push("ERROR: " + addresses[i] + " -- " + geoRes.error + " <a href='" + nonEmptyResults[i].url + "'>Link</a>");
                }else{
                  var val = geoRes.value[0];
                  var str = Object.keys(val).filter(key => {
                    if(["latitude", "longitude", "provider"].indexOf(key) >= 0) {
                      return false;
                    }
                    return val[key] != null && val[key] != undefined;
                  }).map(key => val[key]).join(" ");
                  if(str.indexOf("Berlin") < 0) {
                    log.push("WHAT?! " + addresses[i] + " -- " + str);
                  }else{
                    log.push("<strong>FOUND:</strong> " + addresses[i] + " -- " + str);
                    toUpdate.push({
                      $id: nonEmptyResults[i].id,
                      $latitude: val.latitude,
                      $longitude: val.longitude
                    });
                  }
                }
              }
              var stmt = db.prepare('UPDATE "wohnungen" SET latitude = $latitude, longitude = $longitude WHERE id = $id');
              var defers = [];
              toUpdate.forEach(obj => {
                var defer = q.defer();
                defers.push(q.promise);
                stmt.run(obj, dbErr => {
                  if(dbErr) {
                    console.log(dbErr);
                  }
                  defer.resolve();
                });
              });
              q.all(defers).then(() => {
                res.send(log.join("<br/>"));
              });
            }
          });
        }
      });
    });

    this.app.listen(this.port, () => {
      console.log('App listening on port ' + this.port);
    });
  }
}