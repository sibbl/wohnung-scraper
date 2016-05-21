var map = L.map('map').setView([52.504703, 13.324861], 12);

var resize = function () {
  var $map = $('#map');

  $map.height($(window).height());

  if (map) {
    map.invalidateSize();
  }
};

$(window).on('resize', function () {
  resize();
});

resize();

var baseLayer = new L.StamenTileLayer('toner', {
  detectRetina: true
});

baseLayer.addTo(map);

$.getJSON("/data", function(result) {

  result.forEach(function(wohnung) {
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
    var key = wohnung.price + "€, " + wohnung.size + "m²";
    var data = {};
    data[key] = 1;
    var chartOptions = {};
    var pricePerSqM = wohnung.price / wohnung.size;
    var text = wohnung.rooms + "Z, " + pricePerSqM.toFixed(2) + "€/m²";
    chartOptions[key] = {
      fillColor: priceFunc.evaluate(pricePerSqM),
      minValue: 0,
      maxValue: 600,
      maxHeight: 20,
      maxRadius: 20,
      displayText: function (value) {
          return text;
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
      window.open(wohnung.url);
    })
    marker.addTo(map);
  });
});

