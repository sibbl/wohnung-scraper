const moment = require("moment"),
config = require("../config.js"),
NodeGeocoder = require("node-geocoder"),
request = require("request-promise");


module.exports = {
    redirectToTransport: async (item, direction, config, response) => {

        const transportData = config.transportRoutes.options[config.transportRoutes.provider][direction];
        const data = JSON.parse(item.data);

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
              createInputField("date", "${moment().format('dd.MM.yyyy')}");
              createInputField("timeSel", "depart");
              // createInputField("route_search_now_submit", "");
              document.body.appendChild(form);
              form.submit();
              </script>
              </html>`;
          response.set("Content-Type", "text/html");
          response.send(str);
        };
  
        const adr = data.adresse;
        if (adr.length == 0) {
          if (item.longitude && item.latitude) {
            //reverse geoencode
            const provider = config.geocoder.provider;
            const params = {};
            if (provider in config.geocoder.options) {
              params = config.geocoder.options[provider];
            }
            params.provider = provider;
            const geocoder = NodeGeocoder(params);
            let res;
            try {
              res = await geocoder.reverse({
                lat: item.latitude,
                lon: item.longitude
              });
            } catch (error) {
                response.send("Reverse geocoding failed: " + JSON.stringify(err), 500);
              return;
            }
  
            const adrArr = res[0];
            const adrParts = [];
            for (let i in adrArr) {
              adrParts.push(adrArr[i]);
            }
            await forward(adrParts.join(" "));
          } else {
            response.send("no address found", 404);
          }
        } else {
          await forward(adr);
        }
    }
}