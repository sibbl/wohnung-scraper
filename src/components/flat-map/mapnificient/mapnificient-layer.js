import { LatLng } from "leaflet";
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";
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
  const [mapnificent, setMapnificient] = useState(null);
  const mapnificientPositionRef = useRef(null);

  useEffect(() => {
    // for compatibility
    const mapnificent = new Mapnificent(map, config, {
      dataPath: `https://cdn.jsdelivr.net/gh/mapnificent/mapnificent_cities/${config.cityid}/`,
      baseurl: "./lib/mapnificient/"
    });
    mapnificent.init();
    setMapnificient(mapnificent);
    return () => {
      mapnificent.destroy();
    }
  }, [map, config]);

  useEffect(() => {
    if (position) {
      const latLng = new LatLng(position.latitude, position.longitude);
      const time = (duration || defaultDuration) * 60;
      if (mapnificientPositionRef.current) {
        mapnificientPositionRef.current.updatePosition(latLng, time);
      } else {
        const pos = mapnificent.addPosition(latLng, time);
        mapnificientPositionRef.current = pos;
        if (onLoading) {
          pos.setProgressCallback(onLoading);
        }
      }
    } else if (mapnificientPositionRef.current) {
      mapnificent.removePosition(mapnificientPositionRef.current);
      mapnificientPositionRef.current = null;
    }
  }, [position, duration, defaultDuration, onLoading]);
}
