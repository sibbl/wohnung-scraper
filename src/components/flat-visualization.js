import React from "react";
import styled from "styled-components";
import { FlatMap } from "./flat-map";
import { Sidebar } from "./sidebar";

const StyledFlatVisualization = styled.div`
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
`;

const StyledFlatMap = styled(FlatMap)`
  height: 100%;
  flex: 1;
`;

export const FlatVisualization = ({ ...other }) => (
  <StyledFlatVisualization {...other}>
    <StyledFlatMap />
    <Sidebar />
  </StyledFlatVisualization>
);
