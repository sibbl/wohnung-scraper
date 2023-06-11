const genericMapboxLayer = ({ name, url, ...others }) => ({
  attribution:
    'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
  detectRetina: true,
  ...others,
  name,
  url
});

module.exports = {
  mapboxLayer: ({ id, name, apiKey, version = "v4", ...others }) =>
    genericMapboxLayer({
      name,
      url: `https://api.mapbox.com/${version}/${id}/{z}/{x}/{y}.png?access_token=${apiKey}`,
      ...others
    }),
    mapboxStyleLayer: ({ id, name, apiKey, version = "v1", ...others }) =>
    genericMapboxLayer({
      name,
      url: `https://api.mapbox.com/styles/${version}/${id}/tiles/{tileSize}/{z}/{x}/{y}?access_token=${apiKey}`,
      ...others
    })
};
