const { mapboxLayer } = require("../../helper/mapbox");

module.exports = mapboxConfig => {
  const { apiKey } = mapboxConfig;
  return {
    Default: mapboxLayer({
      name: "Noise Map Berlin",
      id: "berlinermorgenpost.n7c2hal9",
      apiKey
    })
  };
};
