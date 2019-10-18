import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { connect } from "react-redux";
import { FlatVisualization } from "../components/flat-visualization";
import { LoadingView } from "../components/loading-view";
import { getConfig } from "../actions/config-actions";
import { getFlats } from "../actions/flat-actions";

const FlatVisualizationContainer = ({
  config,
  flats,
  getFlats,
  getConfig,
  visibleFlatIds,
  selectedFlatId
}) => {
  useEffect(() => {
    getConfig();
    getFlats();
  }, []);
  return config && flats ? (
    <React.Fragment>
      <Helmet>
        <title>
          Wohnung Scraper -{" "}
          {getTitleSuffix(flats, selectedFlatId, visibleFlatIds)}
        </title>
      </Helmet>
      <FlatVisualization />
    </React.Fragment>
  ) : (
    <LoadingView />
  );
};

const getTitleSuffix = (flats, selectedFlatId, visibleFlatIds) => {
  if (selectedFlatId) {
    return flats[selectedFlatId].title;
  } else {
    return (
      visibleFlatIds.length + (visibleFlatIds.length === 1 ? " flat" : " flats")
    );
  }
};

export default connect(
  state => ({
    config_isWorking: state.config.isWorking,
    config_error: state.config.error,
    config: state.config.config,

    flat_isWorking: state.flat.isWorking,
    flat_error: state.flat.error,
    flats: state.flat.flats,

    visibleFlatIds: state.flat.visibleFlatIds,
    selectedFlatId: state.flat.selectedFlatId
  }),
  dispatch => ({
    getConfig: () => dispatch(getConfig()),
    getFlats: () => dispatch(getFlats())
  })
)(FlatVisualizationContainer);
