var express = require('express')
    q = require('q');

module.exports = class App {
  constructor(db, scraper) {
    this.db = db;
    this.app = express();
    this.port = process.env.PORT || 3000;
    
    this.app.use(express.static('./app/public'));

    this.app.get('/scrape', (req, res) => {
      const promises = scraper.map(s => s.scrape());
      q.all(promises).then(() => {
        res.send(JSON.stringify({status: "ok"}));
      });
    });

    this.app.get('/data', (req, res) => {
      db.all('SELECT * FROM "wohnungen" ORDER BY added DESC', (error, result) => {
        if(error) {
          res.send(JSON.stringify(error));
        }else{
          res.send(JSON.stringify(result.map(item => {
            item.data = JSON.parse(item.data);
            return item;
          })));
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

    this.app.listen(this.port, () => {
      console.log('App listening on port ' + this.port);
    });
  }
}