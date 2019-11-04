import React from "react";
import styled from "styled-components";
import InputRange from "react-input-range";
import "react-input-range/lib/css/index.css";

const StyledInputRangeContainer = styled.div`
  padding: 1.4rem 16px;
`;

const Slider = ({ title, className, ...other }) => {
  return (
    <div className={className}>
      <div>{title}</div>
      <StyledInputRangeContainer>
        <InputRange draggableTrack allowSameValues={true} {...other} />
      </StyledInputRangeContainer>
    </div>
  );
};
export default Slider;
