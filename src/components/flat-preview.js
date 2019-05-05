import React from "react";
import styled from "styled-components";

const StyledFlatPreview = styled.div`
    padding: 16px;
    background: #fff;
    border-radius: 4px;
    border: 1px solid #ccc;
    z-index: 10000;
    min-width: 200px;
    box-shadow: 0 4px 4px rgba(0,0,0,0.2);
    font-size: 14px;
`;

export const FlatPreview = ({ flat, ...other }) => (
  <StyledFlatPreview {...other}>todo</StyledFlatPreview>
);
