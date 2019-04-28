import React from "react";
import styled from "styled-components";

const StyledLoadingView = styled.div`
  position: absolute;
  top: 50%;
  width: 100%;
  text-align: center;
  margin-top: -6px;
`;

export const LoadingView = () => (
  <StyledLoadingView>Loading data...</StyledLoadingView>
);
