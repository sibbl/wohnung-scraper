import axios from "axios";

export const loadFlatData = () => {
  return axios.get("/data");
};

export const loadConfig = () => {
  return axios.get("/config");
};
