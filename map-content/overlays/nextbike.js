const axios = require("axios");

const getFlexZoneDataAsync = async ({ domain }) => {
  const url = `https://iframe.nextbike.net/4com/map/?t=fz&domain=${domain}`;
  const { data } = await axios.get(url);
  return data.geojson.nodeValue;
};

const getStationsDataAsync = async ({ cityId }) => {
  const url = `https://api.nextbike.net/maps/nextbike-live.json?city=${cityId}`;
  const { data } = await axios.get(url);
  const features = data.countries[0].cities[0].places
    .filter(place => {
      // filter floating bikes
      return !place.name.startsWith("BIKE ");
    })
    .map(place => {
      return {
        type: "Feature",
        properties: {
          popupContent: place.name
        },
        geometry: {
          type: "Point",
          coordinates: [place.lng, place.lat]
        }
      };
    });
  return {
    type: "FeatureCollection",
    features
  };
};

// please find allowed "cityId" values in https://api.nextbike.net/maps/nextbike-live.json
const getStationsGeoJsonAsync = async ({ cityName, cityId }) => {
  return {
    name: `Nextbike Stations ${cityName}`,
    type: "GeoJSON",
    data: await getStationsDataAsync({ cityId })
  };
};

// please find the allowed "domain" values in the https://iframe.nextbike.net/4com/map/config.json "flexzone_domains" JSON array and/or https://api.nextbike.net/maps/nextbike-live.json
const getFlexZoneGeoJsonAsync = async ({ cityName, domain }) => {
  return {
    name: `Nextbike FlexZone ${cityName}`,
    type: "GeoJSON",
    data: await getFlexZoneDataAsync({ domain })
  };
};

module.exports = {
  getStationsGeoJsonAsync,
  getFlexZoneGeoJsonAsync
};
