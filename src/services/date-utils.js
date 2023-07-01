import { DateTime } from "luxon";

export const getDateTime = date =>
  date === "now" ? DateTime.utc().startOf("day") : DateTime.fromISO(date);
