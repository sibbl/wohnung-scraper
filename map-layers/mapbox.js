const mapboxLayer = ({ id, name, apiKey }) => {
  return {
    name,
    url: `https://api.mapbox.com/styles/v1/${id}/tiles/{tileSize}/{z}/{x}/{y}?access_token=${apiKey}`,
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    detectRetina: true
  };
};

module.exports = ({ apiKey }) => ({
  Streets: mapboxLayer({
    name: "Mapbox Streets",
    id: "mapbox/streets-v11",
    apiKey
  }),
  Outdoors: mapboxLayer({
    name: "Mapbox Outdoors",
    id: "mapbox/outdoors-v11",
    apiKey
  }),
  Light: mapboxLayer({ name: "Mapbox Light", id: "mapbox/light-v10", apiKey }),
  Dark: mapboxLayer({ name: "Mapbox Dark", id: "mapbox/dark-v10", apiKey }),
  Satellite: mapboxLayer({
    name: "Mapbox Satellite",
    id: "mapbox/satellite-v9",
    apiKey
  }),
  SatelliteStreets: mapboxLayer({
    name: "Mapbox Satellite with Streets",
    id: "mapbox/satellite-streets-v11",
    apiKey
  }),
  NavigationPreviewDay: mapboxLayer({
    name: "Mapbox Navigation Preview Day",
    id: "mapbox/navigation-preview-day-v4",
    apiKey
  }),
  NavigationPreviewNight: mapboxLayer({
    name: "Mapbox Navigation Preview Night",
    id: "mapbox/navigation-preview-night-v4",
    apiKey
  }),
  NavigationGuidanceDay: mapboxLayer({
    name: "Mapbox Navigation Guidance Day",
    id: "mapbox/navigation-guidance-day-v4",
    apiKey
  }),
  NavigationGuidanceNight: mapboxLayer({
    name: "Mapbox Navigation Guidance Night",
    id: "mapbox/navigation-guidance-night-v4",
    apiKey
  })
});
