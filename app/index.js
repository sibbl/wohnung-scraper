var express = require('express'),
    bodyParser = require('body-parser'),
    q = require('q'),
    moment = require('moment'),
    config = require('../config.js'),
    basicAuth = require('basic-auth-connect');

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
    })

    this.app.get('/data', (req, res) => {
      db.all('SELECT * FROM "wohnungen" ORDER BY added DESC', (error, result) => {
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
    })

    this.app.listen(this.port, () => {
      console.log('App listening on port ' + this.port);
    });
  }
}