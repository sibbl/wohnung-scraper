import React from "react";
import Slider from "./slider";
import { DateTime } from "luxon";

const DateSlider = ({
  minValue,
  maxValue,
  value,
  unit,
  step,
  onChange,
  ...other
}) => {
  const mapping = [];

  var current = minValue;
  while (current <= maxValue) {
    mapping.push(current);
    if (unit === "month") {
      current = current.startOf("month");
    }
    current = current.plus({ [unit]: step });
  }

  const isDateEqual = (date1, date2) => date1.hasSame(date2, "day");
  const isDateToday = date =>
    isDateEqual(date, DateTime.local().startOf("day"));

  const onChangeMapped = value =>
    onChange({ min: mapping[value.min], max: mapping[value.max] });

  return (
    <Slider
      minValue={0}
      maxValue={mapping.length - 1}
      value={{
        min: mapping.findIndex(elem => isDateEqual(elem, value.min)),
        max: mapping.findIndex(elem => isDateEqual(elem, value.max))
      }}
      onChange={onChangeMapped}
      formatLabel={value =>
        isDateToday(mapping[value]) ? "today" : mapping[value].toLocaleString()
      }
      {...other}
    />
  );
};
export default DateSlider;
