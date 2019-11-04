import React from "react";
import styled from "styled-components";
import FlatMapContainer from "../containers/flat-map-container";
import { Sidebar } from "./sidebar";

const StyledFlatVisualization = styled.div`
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
`;

const StyledFlatMapContainer = styled(FlatMapContainer)`
  height: 100%;
  flex: 1;
`;

export const FlatVisualization = ({ ...other }) => (
  <StyledFlatVisualization {...other}>
    <StyledFlatMapContainer />
    <Sidebar />
  </StyledFlatVisualization>
);
