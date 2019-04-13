'use strict';
angular.module('dataVis')
.controller('MainController', ['$scope', '$rootScope', '$window', '$http', '$q', '$filter', '$timeout', '$location', 'Config', 'leafletData', function($scope, $rootScope, $window, $http, $q, $filter, $timeout, $location, config, leafletData) {
  var map, filterCircle, filterCircleCenter, markers = {}, initialLoad = true;

  var styles = {
    favoriteStyle: {color:"#f00"},
    unfavoriteStyle: {color:"transparent"},
  }

  $scope.status = { // ui status, e.g. filter accordion
    showFilters: true, //show filters by default
    showTransport: false, //hide transport by default
    showDataFilter: true, //show data filter by default
  };
  $scope.$watchGroup(Object.keys($scope.status).map(function(key) {
    return "status." + key;
  }), function() {
    $scope.$broadcast('rzSliderForceRender');
  });
  $scope.data = [];

  // transport layer
  var currentTransportPos;
  $scope.transport = {
    minutes: config.defaultTransportTime,
    sliderOptions: {
      ceil: 60,
      floor: 5,
      showTicks: 15,
      translate: function(value) {
        return value + " Min";
      }
    },
    automatically: config.defaultShowTransportRangeAutomatically,
    routeVisible: false
  }

  $scope.availableWebsites = config.scraper;

  $scope.filter = Object.assign(config.filters.default, {
    websites: Object.keys($scope.availableWebsites),
  });

  $scope.transportRoutes = config.transportRoutes.options[config.transportRoutes.provider];

  //generate next 10 free_from values
  var free_from = [null];
  var start = moment().startOf("month").startOf("day").subtract(1,'day'); //use last day of last month 
  var startIsMonthBegin = true;
  var now = moment().startOf("day");
  if(start.isBefore(now)) { //if start is before now (e.g. 30th of last month is before 5th)
    start = start.add(14, 'days'); //then try 14th of current month
    startIsMonthBegin = false;
    if(start.isBefore(now)) { //if it's still before now (e.g. 14th is before 20th)
      //add one month to last date
      start = moment().startOf("month").startOf("day").add(1, "month").subtract(1,'day');
      startIsMonthBegin = true;
    }
  }
  //generate 8 values (next 4 months)
  for(var i = startIsMonthBegin ? 0 : 1; i < 8; i++) {
    if(i % 2 == 1) {
      //middle of month
      free_from.push(start.clone());
      start = start.add(1, "month").startOf("month").startOf("day").subtract(1,'day'); //last day of month
    }else{
      //start of month
      free_from.push(start.clone());
      start = start.add(14, "days"); //14th of current month
    }
  }

  $scope.filterBounds = {
    price: { min: 0 },
    rooms: { min: 0 },
    size: { min: 0 },
    age: { min: 0 },
    free_from: { min: 0, max: 8 }
  }

  $scope.center = config.map.initialView;

  $scope.dataFilter = config.dataFilter || false;
  $scope.dataFilterModel = {
    setPosition: false,
    enabled: $scope.dataFilter !== false,
  }
  $scope.dataFilterSliderOptions = {
    floor: config.dataFilterRange.min,
    ceil: config.dataFilterRange.max,
    step: config.dataFilterRange.step,
    showTicks: config.dataFilterRange.ticks,
    translate: function(value) {
      return (value / 1000).toLocaleString() + " km";
    },
    onEnd: function() {
      updateData();
    }
  };

  $scope.$on('leafletDirectiveMap.click', function(event, args) {
    if($scope.dataFilterModel.setPosition) {
      var coord = args.leafletEvent.latlng;
      $scope.dataFilter.lat = coord.lat;
      $scope.dataFilter.lng = coord.lng;
      $scope.dataFilterModel.setPosition = false;
      updateData();
    }else{
      $scope.selectedFlat = undefined;
    }
  });

  $scope.$watch('dataFilterModel.setPosition', () => {
    updateCircle();
    updateMarkersVisibility();
  })

  var genericMapboxLayer = function(name, url, mapId, mode, version) {
    return {
        name: name,
        url: url,
        type: 'xyz',
        layerOptions: {
          mode: mode,
          version: version,
          apikey: 'pk.eyJ1Ijoic2liYmwiLCJhIjoiQlFVb2YzYyJ9.tUs45Lp6oAz8ZUmwWVTaZg',
          mapid: mapId,
          detectRetina: true,
          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        },
      };
  }

  var mapboxLayer = function(name, mapId, mode, version) {
    var url = 'https://api.mapbox.com/{version}/{mapid}/{z}/{x}/{y}.png?access_token={apikey}';
    return genericMapboxLayer(name, url, mapId, mode, version || "v4");
  }

  var mapboxStyleLayer = function(name, username, styleId, mode) {
    var url = 'https://api.mapbox.com/styles/{version}/{mapid}/tiles/{z}/{x}/{y}?access_token={apikey}';
    return genericMapboxLayer(name, url, username + "/" + styleId, mode, "v1");
  }

  $scope.layers = {
    baselayers: {
      mapbox_streets: mapboxLayer("Mapbox Streets", "mapbox.streets"),
      mapbox_light: mapboxLayer("Mapbox Light", 'mapbox.light'),
      mapbox_dark: mapboxLayer("Mapbox Dark", 'mapbox.dark', "dark"),
      mapbox_emerald: mapboxLayer("Mapbox Emerald", 'mapbox.emerald'),
      mapbox_noise: mapboxLayer("Lärmkarte", "berlinermorgenpost.n7c2hal9", "dark"),
      mapbox_churches: mapboxStyleLayer("Kirchen", "sibbl", "ciqamzoia000mdxkvqbm8jud5"),
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

  var updateCircle = function() {
    if(map == undefined) {
      return;
    }
    if(filterCircle && map.hasLayer(filterCircle)) {
      map.removeLayer(filterCircle);
      filterCircle = undefined;
    }
    if($scope.dataFilterModel.enabled === true) {
      filterCircle = L.circle($scope.dataFilter, $scope.dataFilter.radius, {
        color: '#f00',
        weight: 1.5,
        opacity: .2,
        fill: false
      });
      map.addLayer(filterCircle);
    }
    if(filterCircleCenter && map.hasLayer(filterCircleCenter)) {
      map.removeLayer(filterCircleCenter);
      filterCircleCenter = undefined;
    }
    if($scope.dataFilterModel.setPosition) {
      filterCircleCenter = L.circleMarker($scope.dataFilter, {
        stroke: false,
        fillColor: '#f00',
        fillOpacity: 0.9,
      });
      filterCircleCenter.setRadius(5);
      map.addLayer(filterCircleCenter);
    }
  }

  var updateIndex = 0;
  $scope.dataLoading = 0;
  var updateData = function() {
    updateCircle();
    var options = {};
    if($scope.dataFilterModel.enabled) {
      options.params = $scope.dataFilter;
    }
    var index = ++updateIndex;
    $scope.dataLoading++;
    $http.get('/data', options).then(function(data) {
      $scope.dataLoading--;
      if(index == updateIndex) {
        $scope.data = data.data;
        if(initialLoad) {
          initialLoad = false;
          updateSelectedFlatById();
        }
      }
    });
  }

  $scope.refresh = updateData;

  $scope.$watchGroup(['dataFilter.lat', 'dataFilter.lng', 'dataFilterModel.enabled'], updateData);
  $scope.$watch('dataFilter.radius', updateCircle);

  leafletData.getMap().then(function(mapResult) {
    map = mapResult;
    initMapnificent(map);
    updateData();
  });

  $scope.getWebsiteName = function(website) {
    return config.scraper[website].name;
  }

  var setBounds = function(name, wohnung) {
    // set min if smaller or no value set yet
    if(angular.isDefined($scope.filterBounds[name].min)) {
      if(wohnung[name] < $scope.filterBounds[name].min) {
        $scope.filterBounds[name].min = wohnung[name];
      }
    }else{
      $scope.filterBounds[name].min = wohnung[name];
    }
    // set max if bigger or no value set yet
    if(angular.isDefined($scope.filterBounds[name].max)) {
      if(wohnung[name] > $scope.filterBounds[name].max) {
        $scope.filterBounds[name].max = wohnung[name];
      }
    }else{
      $scope.filterBounds[name].max = wohnung[name];
    }
    // if too high, crop it
    if($scope.filterBounds[name].max > config.filters.upperLimits[name]) {
      $scope.filterBounds[name].max = config.filters.upperLimits[name];
    }
  }

  $scope.$watch('data', function(newValue, oldValue) {
    angular.forEach($scope.data, function(wohnung, index) {
      if(wohnung.latitude == null || wohnung.longitude == null) {
        console.warn("missing latitude or longitude", wohnung);
        return;
      }

      //[input, output]
      var sizeFunc = new L.LinearFunction([0, 0], [80, 30], {
        constrainX:true,
        preProcess: function(value) {
          return this.constrainX(value);
        }
      });
      var priceFunc = new L.HSLHueFunction(new L.Point(6, 120), new L.Point(config.maxPricePerSqM, 0), {
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
        'frei ab: ' + $scope.getFreeFromStr(wohnung),
        ''
      ];

      ["price", "rooms", "size", "age"].map(function(name) {
        setBounds(name, wohnung);
      }) 

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
      var coords = new L.LatLng(wohnung.latitude, wohnung.longitude);
      var marker = new L.StackedRegularPolygonMarker(coords, {
          radius: sizeFunc.evaluate(wohnung.size),
          numberOfSides: (wohnung.rooms + 1),
          rotation: -90,
          data: data,
          chartOptions: chartOptions,
      });
      marker.on('click', function() {
        $timeout(function() {
          $scope.selectedFlat = wohnung;
          if($scope.transport.automatically) {
            $scope.showTransportOverlay(wohnung);
          }
        });
      })

      $scope.$watch('transport.minutes', function(newMinutes) {
        if(angular.isDefined(currentTransportPos)) {
          currentTransportPos.setTime(newMinutes * 60);
        }
      });

      $scope.$watch("data[" + index + "].active", function(newActive, oldActive) {
        if(angular.isUndefined(newActive)) {
          return;
        }
        if(angular.isDefined(oldActive) && oldActive != newActive) {
          updateActive(newActive, wohnung.id);
          if($scope.filter.hideInactive && newActive == false && angular.isDefined($scope.selectedFlat) && $scope.selectedFlat.id == wohnung.id) {
            $scope.selectedFlat = undefined;
          }
        }
      })
      $scope.$watch("data[" + index + "].favorite", function(newFav, oldFav) {
        if(angular.isUndefined(newFav)) {
          return;
        }
        if(angular.isDefined(oldFav) && oldFav != newFav) {
          updateFavorite(newFav, wohnung.id);
          if($scope.filter.showOnlyFavs === true && newFav === false && angular.isDefined($scope.selectedFlat) && $scope.selectedFlat.id == wohnung.id) {
            $scope.selectedFlat = undefined;
          }
        }
      })
      if(markers[wohnung.id] && map.hasLayer(markers[wohnung.id])) {
        map.removeLayer(markers[wohnung.id]);
      }
      markers[wohnung.id] = marker;
      if(isMarkerVisible(wohnung.id)) {
        map.addLayer(marker);
        checkMarkerSelection(wohnung.id);
      }
    });
    for(var id in markers) {
      if(!(id in $scope.data)) {
        var marker = markers[id];
        if(map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
        delete markers[id];
      }
    }
  });

  var isMarkerVisible = function(markerId) {
    if($scope.dataFilterModel.setPosition === true) {
      return false;
    }
    if(angular.isDefined($scope.selectedFlat) && $scope.selectedFlat.id == markerId) {
      return true;
    }
    var markerData = $scope.data[markerId];
    if(angular.isUndefined(markerData)) {
      return false;
    }
    if($scope.filter.hideInactive && !markerData.active) {
      return false;
    }
    if($scope.filter.showOnlyFavs && !markerData.favorite) {
      return false;
    }
    if($scope.filter.websites.indexOf(markerData.website) < 0) {
      return false;
    }
    if(markerData.price < $scope.filter.price.min || markerData.price > $scope.filter.price.max) {
      return false;
    }
    if(markerData.rooms < $scope.filter.rooms.min || markerData.rooms > $scope.filter.rooms.max) {
      return false;
    }
    if(markerData.size < $scope.filter.size.min || markerData.size > $scope.filter.size.max) {
      return false;
    }
    if(markerData.age < $scope.filter.age.min || markerData.age > $scope.filter.age.max) {
      return false;
    }
    var minFreeFrom = free_from[$scope.filter.free_from.min];
    var maxFreeFrom = free_from[$scope.filter.free_from.max];
    var freeFromDate = moment(markerData.free_from).startOf("day");
    var now = moment().startOf("day");
    if(minFreeFrom == null) {
      // if "sofort <-> sofort", then return false if from_date is in future 
      if(maxFreeFrom == null) {
        if(freeFromDate.isAfter(now)) {
          return false;
        }
      // if "sofort -> date", then return false if from_date is after given date
      }else if(freeFromDate.isAfter(maxFreeFrom)) {
        return false;
      }
    }else{
      if(freeFromDate.isBefore(minFreeFrom) || freeFromDate.isAfter(maxFreeFrom)) {
        return false;
      }
    }
    return true;
  }

  var updateMarkerVisibility = function(marker, markerId) {
    if(isMarkerVisible(markerId)) {
      if(!map.hasLayer(marker)) {
        map.addLayer(marker);
        checkMarkerSelection(markerId);
      }
    }else{
      if(map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  };

  var updateMarkersVisibility = function() {
    angular.forEach(markers, updateMarkerVisibility);
  }

  $scope.$watch('filter', updateMarkersVisibility, true);

  var updateActive = function(value, id) {
    var data = {
      active: value
    }
    updateMarkerVisibility(markers[id], id);
    $http.post("/" + id + "/active", data).then(response => {
      if(!response.data.success) {
        alert("Failed to change active, please reload the page.");
      }
    })
  }

  var updateFavorite = function(value, id) {
    var data = {
      favorite: value
    }
    updateMarkerVisibility(markers[id], id);
    $http.post("/" + id+ "/favorite", data).then(response => {
      if(!response.data.success) {
        alert("Failed to change favorite, please reload the page.");
      }
    })
  }

  $scope.getFreeFromStr = function(flat) {
    var now = new Date();
    if(flat.free_from == "Invalid date" || flat.free_from < now) {
      return "sofort";
    }else{
      return $filter('date')(flat.free_from, 'dd.MM.yyyy');
    }
  }

  $scope.toDate = function(t) {
    return new Date(t);
  }

  $scope.$watch('selectedFlat', function(newFlat, oldFlat) {
    if(angular.isDefined(newFlat)) {
      markers[newFlat.id].setStyle({color:"red"});
      updateMarkerVisibility(newFlat.id, markers[newFlat.id]);
      $scope.status.showFilters = false;
      $location.path(newFlat.id);
    }
    if(angular.isDefined(oldFlat)) {
      updateMarkerVisibility(oldFlat.id, markers[oldFlat.id]);
      if(map.hasLayer(markers[oldFlat.id]) && !isMarkerVisible(oldFlat.id)) {
        map.removeLayer(markers[oldFlat.id]);
      }
      markers[oldFlat.id].setStyle({color:"transparent"});
    }
  })


  var checkMarkerSelection = function(id) {
    if(angular.isDefined($scope.selectedFlat) && id == $scope.selectedFlat.id) {
      markers[id].setStyle({color:"red"});
    }
  }

  var sliderOptions = {
    price: {
      showTicks: 250,
      step: 50,
      translate: function(value) {
        return value + " €";
      }
    },
    rooms: {
      showTicks: true,
    },
    size: {
      showTicks: 25,
      translate: function(value) {
        return value + " m²";
      }
    },
    age: {
      showTicks: 7,
      rightToLeft: true,
      translate: function(value) {
        if(value > Math.max(6, $scope.filterBounds.age.max)) {
          return "egal";
        }else if(value == 0) {
          return "heute";
        }else if(value == 1) {
          return "gestern";
        }else{
          return value + " Tage";
        }
      }
    },
    free_from: {
      showTicks: true,
      stepsArray: Array.apply(null, {length: free_from.length}).map(Function.call, Number), //creates an array from 0 to N
      translate: function(value) {
        if(Number.isNaN(value) || free_from.length <= value) {
          return value;
        }else{
          var date = free_from[value];
          if(date == null) {
            return "sofort";
          }else{
            return date.clone().add(1, "day").format("DD.MM.");
          }
        }
      }
    }
  };
  $scope.getSliderOptions = function(name) {
    var options = {};
    if(angular.isUndefined(sliderOptions[name].stepsArray)) {
      var min = $scope.filterBounds[name].min;
      if(angular.isUndefined(min)) min = $scope.filter[name].min;
      var max = $scope.filterBounds[name].max;
      if(angular.isUndefined(max)) max = $scope.filter[name].max;

      options = {
        floor: min,
        ceil: max,
      };
    }
    options = Object.assign(options, sliderOptions[name]);
    if(name == "age") {
      if (options.ceil < 7) {
        options.ceil = 7;
      }else{
        options.ceil += 1;
      }
    }
    return options;
  }

  var mapnificent;
  var initMapnificent = function() {
    mapnificent = new Mapnificent(map, config.transportTimeMapnificentConfig, {
      dataPath: `https://cdn.jsdelivr.net/gh/mapnificent/mapnificent_cities/${config.transportTimeMapnificentConfig.cityid}/`,
      baseurl: './lib/mapnificent/'
    });
    mapnificent.init();
  }

  $scope.showTransportOverlay = function(flat) {
    var marker = markers[flat.id];
    $scope.transport.visible = flat.id;
    if(currentTransportPos) {
      mapnificent.removePosition(currentTransportPos);
    }
    currentTransportPos = mapnificent.addPosition(marker._latlng, $scope.transport.minutes * 60);
    currentTransportPos.setProgressCallback(function(percent) {
      $timeout(function() {
        $scope.transportLoadingPercentage = percent;
      });
    });
  }

  $scope.resetTransportOverlay = function() {
    $scope.transport.visible = undefined;
    if(angular.isDefined(currentTransportPos)) {
      // currentTransportPos.destroy();
      currentTransportPos = undefined;
      mapnificent.reset();
    }
  }

  var updateSelectedFlatById = function() {
    if(initialLoad) {
      return;
    }
    var selectedFlatId = $location.path();
    if(selectedFlatId[0] == '/') {
      selectedFlatId = selectedFlatId.substr(1);
    }
    if(selectedFlatId.length > 0) {
      if(selectedFlatId in $scope.data) {
        if(angular.isUndefined($scope.selectedFlat) || $scope.selectedFlat.id != selectedFlatId) {
          $scope.selectedFlat = $scope.data[selectedFlatId];
        }
      }else{
        if(confirm("Die Wohnung liegt nicht im aktuellen Filter oder ist bereits deaktiviert.\n\nSoll die Anbieter-Webseite geöffnet werden?") === true) {
          $window.open("/forward/" + selectedFlatId);
        }
      }
    }
  }

  $scope.openRoute = function(id, direction, $event) {
    var url = "/" + id + "/route/" + direction;
    window.open(url, "routing_" + direction);
    $event.preventDefault();
    return false;
  }

  $scope.print = function(obj) {
    if(angular.isArray(obj)) {
      return obj.join();
    }else{
      return obj;
    }
  }
  
  $scope.$on('$locationChangeSuccess', updateSelectedFlatById); // set active layers on URL change
}]);