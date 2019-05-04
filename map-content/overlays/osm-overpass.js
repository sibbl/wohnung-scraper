const axios = require("axios");

const getQueryGeoJsonAsync = async ({ query }) => {
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];${encodeURI(
    query
  )}out;`;
  const { data } = await axios.get(url);
  const features = data.elements.map(({ lat, lon, id, tags, ...other }) => {
    return {
      type: "Feature",
      properties: {
        popupContent: tags.name || id
      },
      geometry: {
        type: "Point",
        coordinates: [lon, lat]
      }
    };
  });
  return {
    type: "FeatureCollection",
    features
  };
};

const executeQueryAsync = async ({ name, query }) => {
  try {
    return {
      name,
      type: "GeoJSON",
      data: await getQueryGeoJsonAsync({ query })
    };
  } catch (e) {
    console.error(`Failed to query OSM overpass ${name} with query ${query}.`);
    return null;
  }
};

module.exports = {
  executeQueryAsync
};
