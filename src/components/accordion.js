import React from "react";
import styled from "styled-components";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

const StyledAccordionItem = styled.div`
  & + & {
    margin-top: 8px;
  }
  border: 1px solid #bdbdbd;
  border-radius: 4px;
`;

const StyledAccordionHeader = styled.button`
  padding: 8px 16px;
  background: #e0e0e0;
  border: 0;
  width: 100%;
  text-align: left;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  font-weight: 600;
  cursor: pointer;
  &:focus {
    outline: 0;
  }
  &:hover {
    background: #bdbdbd;
  }
`;

const StyledAccordionBody = styled.div`
  padding: 8px 16px;
`;

export const AccordionItem = ({ title, initialIsOpen = false, children }) => {
  const [isOpen, setIsOpen] = React.useState(initialIsOpen);
  return (
    <StyledAccordionItem>
      <StyledAccordionHeader onClick={() => setIsOpen(!isOpen)}>
        <div>{title}</div>
        {isOpen ? <MdExpandLess /> : <MdExpandMore />}
      </StyledAccordionHeader>
      {isOpen && <StyledAccordionBody>{children}</StyledAccordionBody>}
    </StyledAccordionItem>
  );
};
