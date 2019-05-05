import { MapLayer, withLeaflet } from "react-leaflet";
import L from "leaflet";
import { select } from "d3-selection";

class LeafletD3Layer extends MapLayer {
  constructor(...props) {
    super(...props);
    this._draw = this._draw.bind(this);
  }

  createLeafletElement(props) {
    return L.svg(props);
  }

  componentDidMount() {
    const { layerContainer, map } = this.props.leaflet || this.context;

    this.leafletElement.addTo(layerContainer);

    this.svg = select(this.leafletElement._container);
    this.g = this.svg.append("g").attr("class", "leaflet-zoom-hide");

    this.map = map;
    this._draw();

    map.on("viewreset", this._draw);
    map.on("zoomend", this._draw);
  }

  componentWillUnmount() {
    const { layerContainer, map } = this.props.leaflet || this.context;

    map.removeLayer(this.leafletElement);
    layerContainer.removeLayer(this.leafletElement);

    this.svg = null;
    this.g = null;
  }

  componentDidUpdate() {
    this._draw();
  }

  _draw() {
    this.props.drawFunction &&
      this.props.drawFunction({
        container: this.g,
        map: this.map,
        ...this.props
      });
  }
}

export default withLeaflet(LeafletD3Layer);
