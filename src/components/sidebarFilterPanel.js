import React, { useContext, useState } from "react";
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

export const Checkbox = ({ name, label, checked, onCheckedChanged }) => {
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

export const SidebarFilterPanel = () => {
  const [hideInactiveChecked, setHideInactiveChecked] = React.useState(true);
  const [onlyFavoritesChecked, setOnlyFavoritesChecked] = React.useState(false);
  const [price, setPrice] = useState({ min: 0, max: 1200 });
  const [size, setSize] = useState({ min: 60, max: 160 });
  const [rooms, setRooms] = useState({ min: 3, max: 5 });
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
        maxValue={1500}
        value={price}
        onChange={setPrice}
        formatLabel={value => `${value} €`}
      />
      <StyledSlider
        title="Size:"
        minValue={0}
        maxValue={400}
        value={size}
        onChange={setSize}
        formatLabel={value => `${value} m²`}
      />
      <StyledSlider
        title="Rooms:"
        minValue={0}
        maxValue={6}
        value={rooms}
        onChange={setRooms}
      />
    </div>
  );
};
