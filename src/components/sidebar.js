import React from "react";
import styled from "styled-components";
import { AccordionItem } from "./accordion";
import SidebarFilterPanelContainer from "../containers/sidebar-filter-panel-container";
import SelectedFlatDetailsContainer from "../containers/selected-flat-details-container";
import SidebarPublicTransportPanelContainer from "../containers/sidebar-public-transport-panel-container";

const StyledSidebar = styled.div`
  width: 320px;
  padding: 16px;
  overflow-x: hidden;
  overflow-y: auto;
`;

export const Sidebar = () => {
  return (
    <StyledSidebar>
      <SelectedFlatDetailsContainer />
      <AccordionItem title="Public Transport">
        <SidebarPublicTransportPanelContainer />
      </AccordionItem>
      <AccordionItem title="Filter" initialIsOpen={true}>
        <SidebarFilterPanelContainer />
      </AccordionItem>
    </StyledSidebar>
  );
};
