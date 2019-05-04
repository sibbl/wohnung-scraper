import React from "react";
import {
  Map,
  Marker,
  Popup,
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay,
  LayersControl,
  GeoJSON
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SupportedLayerMap = {
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay,
  GeoJSON
};

const DynamicTileLayer = ({ type, layer }) => {
  const LayerComponent = SupportedLayerMap[type] || TileLayer;
  if(type === "GeoJSON") {
    console.log("geojson", layer);
    return null;
  }
  return <LayerComponent {...layer} />;
};

export const FlatMap = ({ flats, config, ...other }) => {
  console.log("FlatMap", flats, config);
  if(!config.map) {
    return null;
  }
  return (
    <Map
      center={config.map.initialView}
      zoom={config.map.initialView.zoom}
      {...other}
    >
      <Marker position={config.map.initialView}>
        <Popup>
          A pretty CSS3 popup.
          <br />
          Easily customizable.
        </Popup>
      </Marker>
      <LayersControl>
        {config.map.layers && config.map.layers.map(({ name, type, ...layer }, i) => (
          <LayersControl.BaseLayer key={name} name={name} checked={i === 0}>
            <DynamicTileLayer type={type} layer={layer} />
          </LayersControl.BaseLayer>
        ))}
        {config.map.overlays && config.map.overlays.map(({ name, type, ...layer }, i) => (
          <LayersControl.Overlay key={name} name={name} checked={i === 0}>
            <DynamicTileLayer type={type} layer={layer} />
          </LayersControl.Overlay>
        ))}
      </LayersControl>
    </Map>
  );
};
