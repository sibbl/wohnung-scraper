import React from "react";
import { connect } from "react-redux";
import { FlatMap } from "../components/flat-map";
import { setPreviewedFlat, setSelectedFlat } from "../actions/flat-actions";

const FlatMapContainer = ({
  config,
  visibleFlats,
  setPreviewedFlat,
  setSelectedFlat,
  selectedFlat,
  ...other
}) => (
  <FlatMap
    config={config}
    flats={visibleFlats}
    onFlatPreview={setPreviewedFlat}
    onFlatSelect={setSelectedFlat}
    selectedFlat={selectedFlat}
    {...other}
  />
);

export default connect(
  state => ({
    config: state.config.config,
    visibleFlats: state.flat.visibleFlats,
    selectedFlat: state.flat.selectedFlat
  }),
  dispatch => ({
    setPreviewedFlat: flat => dispatch(setPreviewedFlat({ flat })),
    setSelectedFlat: flat => dispatch(setSelectedFlat({ flat }))
  })
)(FlatMapContainer);
