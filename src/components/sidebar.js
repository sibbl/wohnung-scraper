import React, { useContext } from "react";
import styled from "styled-components";
import { FlatDataContext } from "../contexts/flat-data-context";
import { ConfigContext } from "../contexts/config-context";
import { AccordionItem } from "./accordion";

const StyledSidebar = styled.div`
  width: 320px;
  padding: 16px;
`;

export const Sidebar = ({ ...other }) => {
  const flatData = useContext(FlatDataContext);
  const config = useContext(ConfigContext);
  return (
    <StyledSidebar>
      <AccordionItem title="Public Transport">TODO</AccordionItem>
      <AccordionItem title="Filter" initialIsOpen={true}>
        TODO
      </AccordionItem>
    </StyledSidebar>
  );
};
