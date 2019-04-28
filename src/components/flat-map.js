import React, { useContext } from "react";
import { FlatDataContext } from "../contexts/flat-data-context";
import { ConfigContext } from "../contexts/config-context";
import { Map, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export const FlatMap = ({ ...other }) => {
  const flatData = useContext(FlatDataContext);
  const config = useContext(ConfigContext);
  console.log(config);
  return (
    <Map center={config.map.initialView} zoom={config.map.initialView.zoom} {...other}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={config.map.initialView}>
        <Popup>
          A pretty CSS3 popup.
          <br />
          Easily customizable.
        </Popup>
      </Marker>
    </Map>
  );
};
