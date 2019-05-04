import React, { useEffect } from "react";
import { connect } from "react-redux";
import { FlatVisualization } from "../components/flat-visualization";
import { LoadingView } from "../components/loading-view";
import { getConfig } from "../actions/config-actions";
import { getFlats } from "../actions/flat-actions";

const FlatVisualizationContainer = ({
  config_isWorking,
  flat_isWorking,
  getFlats,
  getConfig
}) => {
  useEffect(() => {
    getConfig();
    getFlats();
  }, []);
  return config_isWorking || flat_isWorking ? (
    <LoadingView />
  ) : (
    <FlatVisualization />
  );
};

export default connect(
  state => ({
    config_isWorking: state.config.isWorking,
    config_error: state.config.error,
    config: state.config.config,

    flat_isWorking: state.flat.isWorking,
    flat_error: state.flat.error,
    flats: state.flat.flats
  }),
  dispatch => ({
    getConfig: () => dispatch(getConfig()),
    getFlats: () => dispatch(getFlats())
  })
)(FlatVisualizationContainer);
