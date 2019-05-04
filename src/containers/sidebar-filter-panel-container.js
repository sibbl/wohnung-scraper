import React from "react";
import { connect } from "react-redux";
import { SidebarFilterPanel } from "../components/sidebar-filter-panel";

const SidebarFilterPanelContainer = ({ config, flats, ...other }) => (
  <SidebarFilterPanel config={config} flats={flats} {...other} />
);

export default connect(
  state => ({
    config: state.config.config,
    flats: state.flat.flats
  }),
  _ => ({})
)(SidebarFilterPanelContainer);
