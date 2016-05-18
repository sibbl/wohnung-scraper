var express = require('express');

module.exports = class App {
  constructor(db) {
    this.db = db;
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.app.get('/', (req, res) => {
      db.all('SELECT * FROM "wohnungen" ORDER BY added DESC', (error, result) => {
        if(error) {
          res.send(JSON.stringify(error));
        }else{
          res.send(JSON.stringify(result));
        }
      });
    });

    this.app.get('/reset', (req, res) => {
      db.run('DELETE FROM "wohnungen"', (error, result) => {
        res.send(JSON.stringify(error ? error : {
          status: "ok"
        }));
      });
    })

    this.app.listen(this.port, () => {
      console.log('App listening on port ' + this.port);
    });
  }
}