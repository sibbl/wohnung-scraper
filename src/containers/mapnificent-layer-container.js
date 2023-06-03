import React from "react";
import { connect } from "react-redux";
import MapnificientLayer from "../components/flat-map/mapnificient/mapnificient-layer";

function MapnificientLayerContainer({ isEnabled, position, ...props }) {
  const internalPosition = isEnabled === false ? null : position;

  return <MapnificientLayer position={internalPosition} {...props} />;
}

export default connect(
  (state) => ({
    isEnabled: state.mapnificent.isEnabled,
    duration: state.mapnificent.duration
  }),
  () => ({
  })
)(MapnificientLayerContainer);
