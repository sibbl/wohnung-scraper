import React from "react";
import { connect } from "react-redux";
import { SidebarFilterPanel } from "../components/sidebar-filter-panel";
import { setFlatFilters } from "../actions/flat-actions";

const SidebarFilterPanelContainer = ({ config, flats, filters, setFlatFilters, ...other }) => (
  <SidebarFilterPanel config={config} flats={flats} filters={filters} updateFilter={setFlatFilters} {...other} />
);

export default connect(
  state => ({
    config: state.config.config,
    filters: state.flat.filters,
    flats: state.flat.flats
  }),
  dispatch => ({
    setFlatFilters: (filters) => dispatch(setFlatFilters(filters))
  })
)(SidebarFilterPanelContainer);
