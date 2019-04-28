import React, { useContext } from "react";
import { FlatDataContext } from "../contexts/flat-data-context";
import { ConfigContext } from "../contexts/config-context";

export const FlatMap = ({ ...other }) => {
  const flatData = useContext(FlatDataContext);
  const config = useContext(ConfigContext);
  return <div {...other}>TODO: Map</div>;
};
