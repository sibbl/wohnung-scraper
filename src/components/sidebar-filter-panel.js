import React from "react";
import styled from "styled-components";
import Slider from "./slider";
import DateSlider from "./date-slider";
import { getDateTime } from "../services/date-utils";

const StyledSlider = styled(Slider)`
  & + & {
    margin-top: 4px;
  }
`;

const Divider = styled.hr`
  border: 0;
  border-top: 1px solid #e0e0e0;
  margin: 12px 0;
`;

const Title = styled.div`
  margin-bottom: 4px;
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

export const SidebarFilterPanel = ({
  flats,
  config,
  filters,
  updateFilter,
  ...other
}) => {
  const limits = config.filters.limits;
  const update = key => value => {
    updateFilter && updateFilter({ [key]: value });
  };

  return (
    <div {...other}>
      <Checkbox
        name="hideInactive"
        label="Hide inactive"
        checked={filters.hideInactive}
        onCheckedChanged={update("hideInactive")}
      />
      <Checkbox
        name="onlyFavorites"
        label="Show only favorites"
        checked={filters.showOnlyFavs}
        onCheckedChanged={update("showOnlyFavs")}
      />

      <Divider />

      <StyledSlider
        title="Price:"
        minValue={limits.price.min}
        maxValue={limits.price.max}
        value={filters.price}
        step={50}
        onChange={update("price")}
        formatLabel={value => `${value} €`}
      />
      <StyledSlider
        title="Size:"
        minValue={limits.size.min}
        maxValue={limits.size.max}
        value={filters.size}
        onChange={update("size")}
        formatLabel={value => `${value} m²`}
      />
      <StyledSlider
        title="Rooms:"
        minValue={limits.rooms.min}
        maxValue={limits.rooms.max}
        value={filters.rooms}
        onChange={update("rooms")}
      />
      <StyledSlider
        as={DateSlider}
        title="Free from:"
        minValue={getDateTime(limits.free_from.min)}
        maxValue={getDateTime(limits.free_from.max)}
        unit="month"
        step={1}
        value={filters.free_from}
        onChange={update("free_from")}
      />
      <StyledSlider
        as={DateSlider}
        title="Age:"
        minValue={getDateTime(limits.age.min)}
        maxValue={getDateTime(limits.age.max)}
        unit="day"
        step={1}
        value={filters.age}
        onChange={update("age")}
      />

      <Divider />

      <Title>Sources:</Title>
      {Object.entries(config.scraper).map(([key, value]) => (
        <Checkbox
          key={key}
          name={key}
          label={value.name}
          checked={filters.enabledSites[key]}
          onCheckedChanged={newValue =>
            update("enabledSites")({
              ...filters.enabledSites,
              [key]: newValue
            })
          }
        />
      ))}
    </div>
  );
};
