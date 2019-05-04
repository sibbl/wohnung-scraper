import axios from "axios";

export const getFlats = async () => {
  const { data } = await axios.get("/data");
  return data;
};

export const getConfig = async () => {
  const { data } = await axios.get("/config");
  return data;
};
