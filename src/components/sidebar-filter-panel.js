import React, { useState } from "react";
import styled from "styled-components";
import Slider from "./slider";

const StyledSlider = styled(Slider)`
  & + & {
    margin-top: 8px;
  }
`;

const Divider = styled.hr`
  border: 0;
  border-top: 1px solid #e0e0e0;
  margin: 12px 0;
`;

const Checkbox = ({ name, label, checked, onCheckedChanged }) => {
  const onCheckboxValueChanged = e => {
    const newValue = e.target.checked;
    onCheckedChanged(newValue);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          name={name}
          value={name}
          checked={checked}
          onChange={onCheckboxValueChanged}
        />
        {label}
      </label>
    </div>
  );
};

export const SidebarFilterPanel = ({ flats, config, ...other }) => {
  const defaultFilters = config.filters.default;
  const upperLimits = config.filters.upperLimits;
  const [hideInactiveChecked, setHideInactiveChecked] = React.useState(
    defaultFilters.hideInactive
  );
  const [onlyFavoritesChecked, setOnlyFavoritesChecked] = React.useState(
    defaultFilters.showOnlyFavs
  );
  const [price, setPrice] = useState(defaultFilters.price);
  const [size, setSize] = useState(defaultFilters.size);
  const [rooms, setRooms] = useState(defaultFilters.rooms);
  return (
    <div>
      <Checkbox
        name="hideInactive"
        label="Hide inactive"
        checked={hideInactiveChecked}
        onCheckedChanged={setHideInactiveChecked}
      />
      <Checkbox
        name="onlyFavorites"
        label="Show only favorites"
        checked={onlyFavoritesChecked}
        onCheckedChanged={setOnlyFavoritesChecked}
      />
      <Divider />
      <StyledSlider
        title="Price:"
        minValue={0}
        maxValue={upperLimits.price}
        value={price}
        onChange={setPrice}
        formatLabel={value => `${value} €`}
      />
      <StyledSlider
        title="Size:"
        minValue={0}
        maxValue={upperLimits.size}
        value={size}
        onChange={setSize}
        formatLabel={value => `${value} m²`}
      />
      <StyledSlider
        title="Rooms:"
        minValue={0}
        maxValue={upperLimits.rooms}
        value={rooms}
        onChange={setRooms}
      />
    </div>
  );
};
