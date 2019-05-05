import React from "react";
import { connect } from "react-redux";
import { FlatMap } from "../components/flat-map";

const FlatMapContainer = ({ config, visibleFlats, ...other }) => (
  <FlatMap config={config} flats={visibleFlats} {...other} />
);

export default connect(
  state => ({
    config: state.config.config,
    visibleFlats: state.flat.visibleFlats
  }),
  _ => ({})
)(FlatMapContainer);
