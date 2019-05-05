import React from "react";
import { connect } from "react-redux";
import { SelectedFlatDetails } from "../components/selected-flat-details";
import { setActiveFlat } from "../actions/flat-active-actions";
import { setFavoriteFlat } from "../actions/flat-favorite-actions";

const SelectedFlatDetailsContainer = ({
  selectedFlat,
  setActiveFlat,
  setFavoriteFlat,
  ...other
}) =>
  selectedFlat && (
    <SelectedFlatDetails
      selectedFlat={selectedFlat}
      setActiveFlat={setActiveFlat}
      setFavoriteFlat={setFavoriteFlat}
      {...other}
    />
  );

export default connect(
  state => ({
    selectedFlat: state.flat.selectedFlat
  }),
  dispatch => ({
    setActiveFlat: ({ flat, active }) =>
      dispatch(setActiveFlat({ flat, active })),
    setFavoriteFlat: ({ flat, favorite }) =>
      dispatch(setFavoriteFlat({ flat, favorite }))
  })
)(SelectedFlatDetailsContainer);
