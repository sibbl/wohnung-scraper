import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { FlatMap } from "../components/flat-map";
import { FlatMapItemPreviewPopup } from "../components/flat-map-item-preview-popup";
import { setPreviewedFlat, setSelectedFlat } from "../actions/flat-actions";
import styled from "styled-components";

const StyledFlatMap = styled(FlatMap)`
  height: 100%;
`;

const StyledContainer = styled.div`
  position: relative;
`;

const StyledFlatMapItemPreviewPopup = styled(FlatMapItemPreviewPopup)`
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
  selectedFlatId,
  previewedFlatId,
  ...other
}) => {
  const [visibleFlats, setVisibleFlats] = useState([]);
  const [currentPreviewedFlat, setCurrentPreviewedFlat] = useState(null);

  useEffect(() => {
    setVisibleFlats(
      Object.entries(flats)
        .filter(([key]) => visibleFlatIds.indexOf(key) >= 0)
        .map(([, value]) => value)
    );
  }, [flats, visibleFlatIds]);

  useEffect(() => {
    setCurrentPreviewedFlat(flats[previewedFlatId]);
  }, [flats, previewedFlatId]);

  return (
    <StyledContainer {...other}>
      {currentPreviewedFlat && (
        <StyledFlatMapItemPreviewPopup flat={currentPreviewedFlat} />
      )}
      <StyledFlatMap
        config={config}
        flats={visibleFlats}
        onFlatPreview={setPreviewedFlat}
        onFlatSelect={setSelectedFlat}
        selectedFlatId={selectedFlatId}
        previewedFlatId={previewedFlatId}
      />
    </StyledContainer>
  );
};

export default connect(
  state => ({
    config: state.config.config,
    flats: state.flat.flats,
    visibleFlatIds: state.flat.visibleFlatIds,
    selectedFlatId: state.flat.selectedFlatId,
    previewedFlatId: state.flat.previewedFlatId
  }),
  dispatch => ({
    setPreviewedFlat: flat => dispatch(setPreviewedFlat({ flat })),
    setSelectedFlat: flat => dispatch(setSelectedFlat({ flat }))
  })
)(FlatMapContainer);
