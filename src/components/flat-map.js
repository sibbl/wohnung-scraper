import React, { useContext } from "react";
import { FlatDataContext } from "../contexts/flat-data-context";
import { ConfigContext } from "../contexts/config-context";
import {
  Map,
  Marker,
  Popup,
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay,
  LayersControl
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SupportedLayerMap = {
  TileLayer,
  WMSTileLayer,
  ImageOverlay,
  VideoOverlay
};

const DynamicTileLayer = ({ type, layer }) => {
  const LayerComponent = SupportedLayerMap[type] || TileLayer;
  return <LayerComponent {...layer} />;
};

export const FlatMap = ({ ...other }) => {
  const flatData = useContext(FlatDataContext);
  const config = useContext(ConfigContext);
  console.log(config);
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
        {config.map.layers.map(({name, type, ...layer}, i) => (
          <LayersControl.BaseLayer key={name} name={name} checked={i === 0}>
            <DynamicTileLayer type={type} layer={layer} />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>
    </Map>
  );
};
