import { DateTime } from "luxon";

export const getDateTime = date =>
  date === "now" ? DateTime.local().startOf("day") : DateTime.fromISO(date);
