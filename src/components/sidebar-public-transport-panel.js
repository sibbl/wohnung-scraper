import { debounce } from "lodash";
import React from "react";
import styled from "styled-components";

const StyledContainerDiv = styled.div`
  display: flex;
`;

const StyledDurationInput = styled.input`
  flex: 1;
`;

export default function SidebarPublicTransportPanel({
  isEnabled,
  duration,
  setIsEnabled,
  setDuration
}) {
  const debouncedSetDuration = debounce(setDuration, 50);

  return (
    <StyledContainerDiv>
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={(x) => setIsEnabled(x.target.checked)}
      />
      <StyledDurationInput
        type="range"
        min={10}
        max={120}
        step={10}
        value={duration}
        disabled={isEnabled === false}
        onChange={(x) => debouncedSetDuration(x.target.valueAsNumber)}
      />
      <span>{duration} Min.</span>
    </StyledContainerDiv>
  );
}
