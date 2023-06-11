import React from "react";
import styled from "styled-components";
import FlatMapContainer from "../containers/flat-map-container";
import { Sidebar } from "./sidebar";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { useState } from "react";

const StyledFlatVisualization = styled.div`
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const StyledFlatMapContainer = styled(FlatMapContainer)`
  height: 100%;
  flex: 1;
`;

const StyledSidebar = styled(Sidebar)`
  width: 320px;
  @media (max-width: 768px) {
    width: 100%;
    height: ${props => props.isExpanded ? '80vh' : '33vh'};
  }
`;

const StyledExtendButton = styled.button`
  border: 0;
  background: #eee;
  width: 100%;
  padding: 6px 0;
  @media (min-width: 768px) {
    display: none;
  }
`;

export const FlatVisualization = ({ ...other }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <StyledFlatVisualization {...other}>
      <StyledFlatMapContainer />
      <StyledExtendButton onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <MdExpandMore /> : <MdExpandLess />}
      </StyledExtendButton>
      <StyledSidebar isExpanded={isExpanded} />
    </StyledFlatVisualization>
  );
};
