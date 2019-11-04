import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { SelectedFlatDetails } from "../components/selected-flat-details";
import { setActiveFlat } from "../actions/flat-active-actions";
import { setFavoriteFlat } from "../actions/flat-favorite-actions";

const SelectedFlatDetailsContainer = ({
  flats,
  selectedFlatId,
  setActiveFlat,
  setFavoriteFlat,
  ...other
}) => {
  const [currentSelectedFlat, setCurrentSelectedFlat] = useState(null);

  useEffect(() => {
    setCurrentSelectedFlat(flats[selectedFlatId]);
  }, [flats, selectedFlatId]);

  if (!currentSelectedFlat) {
    return null;
  }

  return (
    <SelectedFlatDetails
      selectedFlat={currentSelectedFlat}
      setActiveFlat={setActiveFlat}
      setFavoriteFlat={setFavoriteFlat}
      {...other}
    />
  );
};

export default connect(
  state => ({
    flats: state.flat.flats,
    selectedFlatId: state.flat.selectedFlatId
  }),
  dispatch => ({
    setActiveFlat: ({ flat, active }) =>
      dispatch(setActiveFlat({ flat, active })),
    setFavoriteFlat: ({ flat, favorite }) =>
      dispatch(setFavoriteFlat({ flat, favorite }))
  })
)(SelectedFlatDetailsContainer);
