import axios from "axios";

export const getFlats = async () => {
  const { data } = await axios.get("/data");
  return data;
};

export const getConfig = async () => {
  const { data } = await axios.get("/config");
  return data;
};

export const setActiveFlat = async ({ id, active }) => {
  const { data } = await axios.post(`/${id}/active`, { active });
  return data;
};

export const setFavoriteFlat = async ({ id, favorite }) => {
  const { data } = await axios.post(`/${id}/favorite`, { favorite });
  return data;
};
