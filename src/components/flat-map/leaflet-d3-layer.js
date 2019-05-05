import { MapLayer, withLeaflet } from "react-leaflet";
import L from "leaflet";
import { select } from "d3-selection";

class LeafletD3Layer extends MapLayer {
  createLeafletElement(props) {
    return L.svg(props);
  }

  componentDidMount() {
    const { layerContainer, map } = this.props.leaflet || this.context;
    const { data, drawFunction } = this.props;

    this.leafletElement.addTo(layerContainer);

    this.svg = select(this.leafletElement._container);
    this.g = this.svg.append("g").attr("class", "leaflet-zoom-hide");

    this.map = map;
    this.data = data;
    this.drawFunction = drawFunction;
    this._draw();

    map.on("viewreset", this._draw.bind(this));
    map.on("zoomend", this._draw.bind(this));
  }

  componentWillUnmount() {
    const { layerContainer, map } = this.props.leaflet || this.context;

    map.removeLayer(this.leafletElement);
    layerContainer.removeLayer(this.leafletElement);

    this.svg = null;
    this.g = null;
  }

  _draw() {
    this.drawFunction &&
      this.drawFunction({
        container: this.g,
        map: this.map,
        data: this.data
      });
  }
}

export default withLeaflet(LeafletD3Layer);
