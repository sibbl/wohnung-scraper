import React from "react";
import styled from "styled-components";
import { FlatShortDetails } from "./flat-short-details";

const StyledFlatMapItemPreviewPopup = styled.div`
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ccc;
  z-index: 10000;
  min-width: 300px;
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.2);
  font-size: 14px;
`;

export const FlatMapItemPreviewPopup = ({ flat, ...other }) => (
  <StyledFlatMapItemPreviewPopup {...other}>
    <FlatShortDetails flat={flat} />
  </StyledFlatMapItemPreviewPopup>
);
