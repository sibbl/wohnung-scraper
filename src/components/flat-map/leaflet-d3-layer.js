import { useMap } from "react-leaflet";
import L from "leaflet";
import { select } from "d3-selection";
import { useCallback, useEffect, useRef } from "react";

function LeafletD3Layer({ drawFunction, ...drawProps }) {
  const map = useMap();
  const gRef = useRef(null);

  const draw = useCallback(() => {
    if (!drawFunction || !gRef.current || !map) return;
    return drawFunction({
      container: gRef.current,
      map: map,
      ...drawProps
    });
  }, [drawFunction, map, drawProps]);

  useEffect(() => {
    draw();
  }, [drawProps]);

  useEffect(() => {
    const layer = L.svg(drawProps);
    map.addLayer(layer);
    const container = layer._container;
    const svg = select(container);
    const g = svg.append("g").attr("class", "leaflet-zoom-hide");
    gRef.current = g;
    draw();
    map.on("viewreset", draw);
    map.on("zoomend", draw);
    return () => {
      map.removeLayer(layer);
    };
  }, [map]);
}

export default LeafletD3Layer;
