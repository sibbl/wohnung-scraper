import { LatLng } from "leaflet";
import { useRef, useEffect } from "react";
import { useMap } from "react-leaflet";
import Mapnificent from "./lib/mapnificent";

export default function MapnificientLayer({
  config,
  defaultDuration,
  position,
  duration,
  onLoading
}) {
  const map = useMap();
  const mapnificentRef = useRef(null);
  const mapnificientPositionRef = useRef(null);

  useEffect(() => {
    console.log("mapnificent add");
    const mapnificent = new Mapnificent(map, config, {
      dataPath: `https://cdn.jsdelivr.net/gh/mapnificent/mapnificent_cities/${config.cityid}/`,
      baseurl: "./lib/mapnificient/"
    });
    mapnificent.init();
    mapnificentRef.current = mapnificent;
    map.on("viewreset", mapnificent.redraw);
    map.on("zoomend", mapnificent.redraw);
    return () => {
      console.log("mapnificent remove");
      mapnificent.destroy();
    };
  }, [map, config]);

  useEffect(() => {
    if (position) {
      const latLng = new LatLng(position.latitude, position.longitude);
      const time = (duration || defaultDuration) * 60;
      if (mapnificientPositionRef.current) {
        mapnificientPositionRef.current.updatePosition(latLng, time);
      } else {
        const pos = mapnificentRef.current.addPosition(latLng, time);
        mapnificientPositionRef.current = pos;
        if (onLoading) {
          pos.setProgressCallback(onLoading);
        }
      }
    } else if (mapnificientPositionRef.current) {
      mapnificentRef.current.removePosition(mapnificientPositionRef.current);
      mapnificientPositionRef.current = null;
    }
  }, [position, duration, defaultDuration, onLoading]);
}
