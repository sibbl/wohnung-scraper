import { line as d3Line } from "d3";
import { select as d3Select } from "d3-selection";
import { scaleLinear, scaleSequential } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";
import styles from "./flat-drawing-helper.module.css";

const path = d3Line()
  .x(d => d.x)
  .y(d => d.y);

const sizeScale = scaleLinear()
  .range([20, 50])
  .domain([10, 200]);
const sqMPriceScale = scaleSequential(interpolateRdYlGn).domain([15, 7]);

export const createNgon = ({ x, y, sides, radius, rotation = 0 }) => {
  const coords = [];

  for (
    let a = 0 + rotation;
    a <= 360 + rotation;
    a += Math.round(360 / sides)
  ) {
    const theta = (a * Math.PI) / 180;

    coords.push({
      x: x + radius * Math.cos(theta),
      y: y + radius * Math.sin(theta)
    });
  }

  return coords;
};

export const getDrawFunction = ({ config }) => ({ container, map, data }) => {
  const feature = container.selectAll(".flat").data(
    data.map(item => {
      const { x, y } = map.latLngToLayerPoint([item.latitude, item.longitude]);
      const radius = sizeScale(item.size);
      return {
        ...item,
        x,
        y,
        radius,
        polygon: createNgon({
          x,
          y,
          sides: item.rooms + 1,
          radius,
          rotation: 270
        })
      };
    }),
    d => d.id
  );

  const addOrUpdatePath = feature => {
    feature.attr("d", d => (d.rooms === 1 ? null : path(d.polygon)));
  };

  const addOrUpdateCircle = feature => {
    feature.attr("cx", d => (d.rooms === 1 ? d.x : null));
    feature.attr("cy", d => (d.rooms === 1 ? d.y : null));
    feature.attr("r", d => (d.rooms === 1 ? d.radius : null));
  };

  const addOrUpdate = feature => {
    addOrUpdateCircle(feature);
    addOrUpdatePath(feature);
    feature.style("fill", d => sqMPriceScale(d.price / d.size));
    feature.on("mouseover", function() {
      d3Select(this).classed(styles.flatmarkerHovered, true);
    });
    feature.on("mouseout", function() {
      d3Select(this).classed(styles.flatmarkerHovered, false);
    });
  };

  feature
    .enter()
    .append(d =>
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        d.rooms === 1 ? "circle" : "path"
      )
    )
    .attr("class", `flat ${styles.flatmarker}`)
    .call(addOrUpdate);

  feature.exit().remove();

  feature.call(addOrUpdate);
};
