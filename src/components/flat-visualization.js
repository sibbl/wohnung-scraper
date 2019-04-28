import React from "react";
import styled from "styled-components";
import { FlatMap } from "./flat-map";
import { Sidebar } from "./sidebar";

const StyledFlatVisualization = styled.div`
  display: flex;
  flex-flow: row nowrap;
`;

const StyledFlatMap = styled(FlatMap)`
  flex: 1;
`;

export const FlatVisualization = ({ ...other }) => (
  <StyledFlatVisualization {...other}>
    <StyledFlatMap />
    <Sidebar />
  </StyledFlatVisualization>
);
