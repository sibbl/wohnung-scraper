import { line as d3Line } from "d3";
import { scaleLinear, scaleSequential } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

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
      return {
        ...item,
        x,
        y,
        polygon: createNgon({
          x,
          y,
          sides: item.rooms + 1,
          radius: sizeScale(item.size),
          rotation: 270
        })
      };
    }),
    d => d.id
  );

  const addOrUpdateFeature = feature => {
    feature
      .attr("d", d => path(d.polygon))
      .style("fill", d => sqMPriceScale(d.price / d.size))
      .style("opacity", 0.8);
  };

  feature
    .enter()
    .append("path")
    .attr("class", "flat")
    .call(addOrUpdateFeature);

  feature.exit().remove();

  feature.call(addOrUpdateFeature);
};
