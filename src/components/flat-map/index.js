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
import LeafletD3Layer from "./leaflet-d3-layer";
import { fixIconUrls } from "./leaflet-utils";
import { getDrawFunction } from "./flat-drawing-helper";

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

fixIconUrls();

const DynamicTileLayer = ({ type, layer }) => {
  const LayerComponent = SupportedLayerMap[type] || TileLayer;
  if (type === "GeoJSON") {
    layer.onEachFeature = onEachGeoJsonFeature;
    layer.style = feature => feature.style || feature.properties;
  }
  return <LayerComponent {...layer} />;
};

export const FlatMap = ({
  flats,
  config,
  onFlatPreview,
  onFlatSelect,
  selectedFlatId,
  ...other
}) => {
  return (
    <Map
      center={config.map.initialView}
      zoom={config.map.initialView.zoom}
      onClick={() => onFlatSelect(null)}
      {...other}
    >
      <LeafletD3Layer
        drawFunction={getDrawFunction(config)}
        flats={flats}
        selectedFlatId={selectedFlatId}
        onMouseOver={onFlatPreview}
        onMouseOut={() => onFlatPreview(null)}
        onClick={onFlatSelect}
      />

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
