import React from "react";
import styled from "styled-components";
import { AccordionItem } from "./accordion";
import SidebarFilterPanelContainer from "../containers/sidebar-filter-panel-container";
import SelectedFlatDetailsContainer from "../containers/selected-flat-details-container";

const StyledSidebar = styled.div`
  width: 320px;
  padding: 16px;
  overflow-x: hidden;
  overflow-y: auto;
`;

export const Sidebar = ({ ...other }) => {
  return (
    <StyledSidebar>
      <AccordionItem title="Public Transport">TODO</AccordionItem>
      <AccordionItem title="Filter" initialIsOpen={true}>
        <SidebarFilterPanelContainer />
      </AccordionItem>
      <SelectedFlatDetailsContainer />
    </StyledSidebar>
  );
};
