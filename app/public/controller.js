'use strict';
angular.module('dataVis')
.controller('MainController', ['$scope', '$rootScope', '$window', '$http', '$q', 'Config', 'leafletData', function($scope, $rootScope, $window, $http, $q, config, leafletData) {
  var map;
  $scope.data = [];

  $scope.center = config.map.initialView;
  $scope.layers = {
    baselayers: {
      mapbox_dark: {
        name: 'Dark',
        url: 'http://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
        type: 'xyz',
        layerOptions: {
          apikey: 'pk.eyJ1Ijoic2liYmwiLCJhIjoiQlFVb2YzYyJ9.tUs45Lp6oAz8ZUmwWVTaZg',
          mapid: 'mapbox.streets',
          detectRetina: true,
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        },
      },
      osm: {
        name: 'OpenStreetMap',
        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        layerOptions: {
          detectRetina: true,
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        },
        type: 'xyz',
      },
      stamen: {
        name: 'Stamen',
        layerOptions: {
          subdomains: ['','a.','b.','c.','d.'],
          detectRetina: true,
          attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
        },
        url: 'http://{s}tile.stamen.com/toner/{z}/{x}/{y}.png',
        type: 'xyz',
      },
      transport: {
        name: 'ÖPNV',
        layerOptions: {
          detectRetina: true,
          attribution: 'Map tiles by <a href="http://www.xn--pnvkarte-m4a.de/">ÖPNV Karte</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
        },
        url: 'http://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png',
        type: 'xyz',
      }

      
    },
    overlays: {}
  };

  $q.all({
    data:  $http.get('/data'),
    map: leafletData.getMap()
  }).then(function(results) {
    map = results.map;
    $scope.data = results.data.data;
  });

  $scope.getWebsiteName = function(website) {
    return config.scraper[website].name;
  }

  $scope.$watch('data', function(newValue, oldValue) {
    $scope.data.forEach(function(wohnung) {
      if(!wohnung.active) {
        console.log("inactive: " + wohnung.id);
        return;
      }
      //[input, output]
      var sizeFunc = new L.LinearFunction([0, 0], [80, 30], {
        constrainX:true,
        preProcess: function(value) {
          return this.constrainX(value);
        }
      });
      var priceFunc = new L.HSLHueFunction(new L.Point(6, 120), new L.Point(20, 0), {
        constrainX:true,
        preProcess: function(value) {
          return this.constrainX(value);
        }
      }); //green (hue of 120) and red (hue of 0)
      var data = {
        item: 1
      };
      var pricePerSqM = wohnung.price / wohnung.size;
      var text = [
        '<strong>' + wohnung.size + " m²",
        wohnung.price + " €",
        wohnung.rooms + " Zimmer</strong>",
        pricePerSqM.toFixed(2) + "€/m²",
        ''
      ];
      for (var key in wohnung.data) {
        if(wohnung.data[key] != null && wohnung.data.hasOwnProperty(key)) {
          text.push(key + ": " + wohnung.data[key]);
        }
      }
      var chartOptions = {
        item: {
          fillColor: priceFunc.evaluate(pricePerSqM),
          minValue: 0,
          maxValue: 600,
          maxHeight: 20,
          maxRadius: 20,
          tooltip: false,
          displayText: function (value) {
              return text.join("<br/>");
          }
        }
      };
      var marker = new L.StackedRegularPolygonMarker(new L.LatLng(wohnung.latitude, wohnung.longitude), {
          radius: sizeFunc.evaluate(wohnung.size),
          numberOfSides: (wohnung.rooms + 1),
          rotation: -90,
          data: data,
          chartOptions: chartOptions
      });
      marker.on('click', function() {
        $scope.selectedFlat = wohnung;
      })
      marker.addTo(map);
    });
  });
}]);