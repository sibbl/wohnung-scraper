import React from "react";
import {
  Map,
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay,
  LayersControl,
  GeoJSON
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const SupportedLayerMap = {
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay,
  GeoJSON
};

const onEachGeoJsonFeature = (feature, layer) => {
  if (feature.properties && feature.properties.popupContent) {
    layer.bindPopup(feature.properties.popupContent);
  }
};

(function fixIconUrls() {
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png")
  });
})();

const DynamicTileLayer = ({ type, layer }) => {
  const LayerComponent = SupportedLayerMap[type] || TileLayer;
  if (type === "GeoJSON") {
    layer.onEachFeature = onEachGeoJsonFeature;
    layer.style = feature => feature.style || feature.properties;
  }
  return <LayerComponent {...layer} />;
};

export const FlatMap = ({ flats, config, ...other }) => {
  console.log("FlatMap", flats, config);
  if (!config.map) {
    return null;
  }
  return (
    <Map
      center={config.map.initialView}
      zoom={config.map.initialView.zoom}
      {...other}
    >
      <LayersControl>
        {config.map.layers &&
          config.map.layers.map(({ name, type, ...layer }, i) => (
            <LayersControl.BaseLayer key={name} name={name} checked={i === 0}>
              <DynamicTileLayer type={type} layer={layer} />
            </LayersControl.BaseLayer>
          ))}
        {config.map.overlays &&
          config.map.overlays.map(({ name, type, ...layer }) => (
            <LayersControl.Overlay key={name} name={name}>
              <DynamicTileLayer type={type} layer={layer} />
            </LayersControl.Overlay>
          ))}
      </LayersControl>
    </Map>
  );
};
