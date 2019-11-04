const { mapboxStyleLayer } = require("./helper/mapbox");

module.exports = mapboxConfig => {
  const { apiKey } = mapboxConfig;
  return {
    Streets: mapboxStyleLayer({
      name: "Mapbox Streets",
      id: "mapbox/streets-v11",
      apiKey
    }),
    Outdoors: mapboxStyleLayer({
      name: "Mapbox Outdoors",
      id: "mapbox/outdoors-v11",
      apiKey
    }),
    Light: mapboxStyleLayer({
      name: "Mapbox Light",
      id: "mapbox/light-v10",
      apiKey
    }),
    Dark: mapboxStyleLayer({ name: "Mapbox Dark", id: "mapbox/dark-v10", apiKey }),
    Satellite: mapboxStyleLayer({
      name: "Mapbox Satellite",
      id: "mapbox/satellite-v9",
      apiKey
    }),
    SatelliteStreets: mapboxStyleLayer({
      name: "Mapbox Satellite with Streets",
      id: "mapbox/satellite-streets-v11",
      apiKey
    }),
    NavigationPreviewDay: mapboxStyleLayer({
      name: "Mapbox Navigation Preview Day",
      id: "mapbox/navigation-preview-day-v4",
      apiKey
    }),
    NavigationPreviewNight: mapboxStyleLayer({
      name: "Mapbox Navigation Preview Night",
      id: "mapbox/navigation-preview-night-v4",
      apiKey
    }),
    NavigationGuidanceDay: mapboxStyleLayer({
      name: "Mapbox Navigation Guidance Day",
      id: "mapbox/navigation-guidance-day-v4",
      apiKey
    }),
    NavigationGuidanceNight: mapboxStyleLayer({
      name: "Mapbox Navigation Guidance Night",
      id: "mapbox/navigation-guidance-night-v4",
      apiKey
    })
  };
};
