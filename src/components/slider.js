import React, { useEffect, useState } from "react";
import styled from "styled-components";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";

const StyledRangeSliderContainer = styled.div`
  padding: 1.4rem 16px;
`;

const StyledLabelsDiv = styled.div`
  margin-top: 8px;
`

const Slider = ({
  title,
  className,
  formatLabel,
  minValue,
  maxValue,
  step,
  value,
  onChange,
  ...other
}) => {
  const [internalValue, setInternalValue] = useState([value.min, value.max]);
  useEffect(() => {
    setInternalValue([value.min, value.max]);
  }, [value]);
  const onInput = (value) =>
    value && onChange({ min: value[0], max: value[1] });
  formatLabel ||= (x) => x;
  return (
    <div className={className}>
      <div>{title}</div>
      <StyledRangeSliderContainer>
        <RangeSlider
          min={minValue}
          max={maxValue}
          step={step}
          value={internalValue}
          onInput={onInput}
          {...other}
        />
        <StyledLabelsDiv>
          {formatLabel(internalValue[0])} - {formatLabel(internalValue[1])}
        </StyledLabelsDiv>
      </StyledRangeSliderContainer>
    </div>
  );
};
export default Slider;
