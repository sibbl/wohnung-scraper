import React from "react";
import styled from "styled-components";
import { AccordionItem } from "./accordion";
import { SidebarFilterPanel } from "./sidebarFilterPanel";

const StyledSidebar = styled.div`
  width: 320px;
  padding: 16px;
`;

export const Sidebar = ({ ...other }) => {
  return (
    <StyledSidebar>
      <AccordionItem title="Public Transport">TODO</AccordionItem>
      <AccordionItem title="Filter" initialIsOpen={true}>
        <SidebarFilterPanel />
      </AccordionItem>
    </StyledSidebar>
  );
};
