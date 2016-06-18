var express = require('express'),
    bodyParser = require('body-parser'),
    q = require('q'),
    config = require('../config.js');

module.exports = class App {
  constructor(db, scraper) {
    this.db = db;
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    this.app.use(express.static('./app/public'));
    this.app.use(bodyParser.json());

    this.app.get('/scrape', (req, res) => {
      const promises = scraper.map(s => s.scrape());
      q.all(promises).then(() => {
        res.send(JSON.stringify({status: "ok"}));
      });
    });

    this.app.get('/update', (req, res) => {
      const promises = scraper.map(s => s.updateItems());
      q.all(promises).then(() => {
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
          var resultArr = result.map(item => {
            item.data = JSON.parse(item.data);
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

    this.app.listen(this.port, () => {
      console.log('App listening on port ' + this.port);
    });
  }
}