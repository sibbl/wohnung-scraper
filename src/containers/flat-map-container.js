import React from "react";
import { connect } from "react-redux";
import { FlatMap } from "../components/flat-map";

const FlatMapContainer = ({ config, flats, ...other }) => (
  <FlatMap config={config} flats={flats} {...other} />
);

export default connect(
  state => ({
    config: state.config.config,
    flats: state.flat.flats
  }),
  _ => ({})
)(FlatMapContainer);
