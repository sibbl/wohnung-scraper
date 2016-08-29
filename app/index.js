var express = require('express'),
    bodyParser = require('body-parser'),
    q = require('q'),
    moment = require('moment'),
    config = require('../config.js'),
    basicAuth = require('basic-auth-connect'),
    geolib = require('geolib'),
    NodeGeocoder = require('node-geocoder'),
    request = require('request');

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

    this.app.get("/:id/route/:direction?", (req, res) => {
        db
          .prepare('SELECT data, latitude, longitude FROM "wohnungen" WHERE id = $id')
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
                var data = JSON.parse(row.data);

                var forward = function(adr) {
                  var name = encodeURIComponent(adr);

                  var url = `http://fahrinfo.vbb.de/bin/ajax-getstop.exe/dny?start=1&tpl=suggest2json&REQ0JourneyStopsS0A=7&getstop=1&noSession=yes&REQ0JourneyStopsS0F=excludeStationAttribute;FO&REQ0JourneyStopsB=12&REQ0JourneyStopsS0G=${name}&js=true&`;
                  request.get(url, (error, response, body) => {
                    var firstEqualSign = body.indexOf("=");
                    var firstSemicolon = body.indexOf(";");
                    var json = JSON.parse(body.substr(firstEqualSign+1, firstSemicolon-firstEqualSign-1));
                    // json.substr(0, json.length-1);
                    var startName = json.suggestions[0].value;
                    var startId = json.suggestions[0].id;
                  
                    // var startName = "10829 Berlin-Schöneberg, Gesslerstr. 15";
                    // var startId = "A=2@O=10829 Berlin-Schöneberg, Gesslerstr. 15@X=13366636@Y=52486099@U=103@L=007707855@B=1@V=3.9,@p=1464105852@";
                    var endName = "S Griebnitzsee Bhf";
                    var endId = "A=1@O=S Griebnitzsee Bhf@X=13128916@Y=52393987@U=86@L=009230003@B=1@V=3.9,@p=1472124910@";
                    if(req.params.direction == "zoo") {
                      endName = "S+U Zoologischer Garten Bhf (Berlin)";
                      endId = "A=1@O=S+U Zoologischer Garten Bhf (Berlin)@X=13332710@Y=52506918@U=86@L=009023201@B=1@V=3.9,@p=1472124910@";
                    }
                    var str = `<!DOCTYPE html>
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
                    res.set('Content-Type', 'text/html');
                    res.send(str);
                  });
                }

                var adr = data.adresse;
                if(adr.length == 0) {
                  if(row.longitude && row.latitude) {
                    //reverse geoencode
                    var provider = req.params.provider || config.geocoder.provider;
                    var params = {};
                    if(provider in config.geocoder.options) {
                      params = config.geocoder.options[provider];
                    }
                    params.provider = provider;
                    var geocoder = NodeGeocoder(params);
                    geocoder.reverse({
                      lat: row.latitude,
                      lon: row.longitude
                    }).then(function(res) {
                      var adrArr = res[0];
                      var adrParts = [];
                      for(var i in adrArr) {
                        adrParts.push(adrArr[i]);
                      }
                      forward(adrParts.join(" "));
                    }).catch(function(err) {
                      res.send("error: " + JSON.stringify(err), 500);
                    })
                  }else{
                    res.send("no address found", 404);
                  }
                }else{
                  forward(adr);
                }
              }
            }
          });
        });

    this.app.post("/update/location", (req, res) => {
      var id = req.body.id;
      var lat = req.body.latitude;
      var lng = req.body.longitude;
      if(id && lat && lng) {
        var stmt = db.prepare('UPDATE "wohnungen" SET latitude = $latitude, longitude = $longitude WHERE id = $id');
        stmt.run({
          $id: id,
          $latitude: lat,
          $longitude: lng
        }, dbErr => {
          if(dbErr) {
            console.log(dbErr);
            res.send(JSON.stringify({success:false, error: dbErr}), 500);
          }else{
            res.send(JSON.stringify({success:true}), 200);
          }
        });
      }else{
        res.send(JSON.stringify({success:false, error: "missing params"}), 400);
      }
    })

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