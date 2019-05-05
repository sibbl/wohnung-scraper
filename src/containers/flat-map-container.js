import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { FlatMap } from "../components/flat-map";
import { FlatPreview } from "../components/flat-preview";
import { setPreviewedFlat, setSelectedFlat } from "../actions/flat-actions";
import styled from "styled-components";

const StyledFlatMap = styled(FlatMap)`
  height: 100%;
`;

const StyledContainer = styled.div`
  position: relative;
`;

const StyledFlatPreview = styled(FlatPreview)`
  position: absolute;
  bottom: 16px;
  right: 16px;
`;

const FlatMapContainer = ({
  config,
  flats,
  visibleFlatIds,
  setPreviewedFlat,
  setSelectedFlat,
  selectedFlat,
  previewedFlat,
  ...other
}) => {
  const [visibleFlats, setVisibleFlats] = useState([]);

  useEffect(() => {
    setVisibleFlats(
      Object.entries(flats)
        .filter(([key]) => visibleFlatIds.indexOf(key) >= 0)
        .map(([, value]) => value)
    );
  }, [flats, visibleFlatIds]);

  console.log(visibleFlats);

  return (
    <StyledContainer {...other}>
      {previewedFlat && <StyledFlatPreview flat={previewedFlat} />}
      <StyledFlatMap
        config={config}
        flats={visibleFlats}
        onFlatPreview={setPreviewedFlat}
        onFlatSelect={setSelectedFlat}
        selectedFlat={selectedFlat}
      />
    </StyledContainer>
  );
};

export default connect(
  state => ({
    config: state.config.config,
    flats: state.flat.flats,
    visibleFlatIds: state.flat.visibleFlatIds,
    selectedFlat: state.flat.selectedFlat,
    previewedFlat: state.flat.previewedFlat
  }),
  dispatch => ({
    setPreviewedFlat: flat => dispatch(setPreviewedFlat({ flat })),
    setSelectedFlat: flat => dispatch(setSelectedFlat({ flat }))
  })
)(FlatMapContainer);
