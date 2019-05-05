import React, { useState } from "react";
import styled from "styled-components";
import Slider from "./slider";
import DateSlider from "./date-slider";
import { DateTime } from "luxon";

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

const getDate = date =>
  date === "now" ? DateTime.local().startOf("day") : DateTime.fromISO(date);

export const SidebarFilterPanel = ({ flats, config, ...other }) => {
  const defaultFilters = config.filters.default;
  const limits = config.filters.limits;
  const [hideInactiveChecked, setHideInactiveChecked] = React.useState(
    defaultFilters.hideInactive
  );
  const [onlyFavoritesChecked, setOnlyFavoritesChecked] = React.useState(
    defaultFilters.showOnlyFavs
  );
  const [price, setPrice] = useState(defaultFilters.price);
  const [size, setSize] = useState(defaultFilters.size);
  const [rooms, setRooms] = useState(defaultFilters.rooms);
  const [freeFrom, setFreeFrom] = useState({
    min: getDate(defaultFilters.free_from.min),
    max: getDate(defaultFilters.free_from.max)
  });
  const [age, setAge] = useState({
    min: getDate(defaultFilters.age.min),
    max: getDate(defaultFilters.age.max)
  });

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
        maxValue={limits.price}
        value={price}
        onChange={setPrice}
        formatLabel={value => `${value} €`}
      />
      <StyledSlider
        title="Size:"
        minValue={0}
        maxValue={limits.size}
        value={size}
        onChange={setSize}
        formatLabel={value => `${value} m²`}
      />
      <StyledSlider
        title="Rooms:"
        minValue={0}
        maxValue={limits.rooms}
        value={rooms}
        onChange={setRooms}
      />
      <StyledSlider
        as={DateSlider}
        title="Free from:"
        minValue={getDate("now")}
        maxValue={getDate(limits.free_from)}
        unit="month"
        step={1}
        value={freeFrom}
        onChange={setFreeFrom}
      />
      <StyledSlider
        as={DateSlider}
        title="Age:"
        minValue={getDate(limits.age)}
        maxValue={getDate("now")}
        unit="day"
        step={1}
        value={age}
        onChange={setAge}
      />
    </div>
  );
};
