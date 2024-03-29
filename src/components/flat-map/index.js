import React from "react";
import {
  MapContainer,
  Circle,
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay,
  LayersControl,
  GeoJSON,
  useMapEvents
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LeafletD3Layer from "./leaflet-d3-layer";
import MapnificientLayerContainer from "../../containers/mapnificent-layer-container";
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
    layer.style = (feature) => feature.style || feature.properties;
  }
  return <LayerComponent {...layer} />;
};

const MapEvents = ({...events}) => {
  useMapEvents(events);
}

export const FlatMap = ({
  flats,
  config,
  onFlatPreview,
  onFlatSelect,
  selectedFlatId,
  previewedFlatId,
  ...other
}) => {
  const selectedFlat = selectedFlatId
    ? flats.find((x) => x.id === selectedFlatId)
    : null;
  const dataFilters = Array.isArray(config.dataFilter)
    ? config.dataFilter
    : [config.dataFilter];
  return (
    <MapContainer
      center={config.map.initialView}
      zoom={config.map.initialView.zoom}
      {...other}
    >
      <MapEvents click={() => onFlatSelect(null)} />
      {dataFilters.map(({ lat, lng, radius }, i) => (
        <Circle
          key={i}
          center={[lat, lng]}
          radius={radius}
          fill={false}
          color="rgba(0,0,0,0.2)"
          weight={2}
        />
      ))}

      <LeafletD3Layer
        drawFunction={getDrawFunction({ config })}
        flats={flats}
        previewedFlatId={previewedFlatId}
        selectedFlatId={selectedFlatId}
        onMouseOver={(flat) => onFlatPreview(flat ? flat.id : null)}
        onMouseOut={() => onFlatPreview(null)}
        onClick={(flat) => onFlatSelect(flat ? flat.id : null)}
      />

      <MapnificientLayerContainer
        config={config.transportTimeMapnificentConfig}
        defaultDuration={config.defaultTransportTime}
        position={selectedFlat}
        duration={30}
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
    </MapContainer>
  );
};
