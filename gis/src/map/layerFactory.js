import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import GeoJSON from "ol/format/GeoJSON";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import { createLayerStyle } from "./styles";
import { transformExtent } from "ol/proj";
import { EPSG_ID, workspace } from "../config/mapConst";
import { getWFSUrl } from "../api/geoserver";

const layerColors = [
  "#ff6666",
  "#66ccff",
  "#66ff99",
  "#ffcc66",
  "#cc99ff",
  "#ff99cc",
  "#99ffcc",
  "#cccc66",
];
let layerIndex = 0;

export function createWFSLayer(layerName) {
  const color = layerColors[layerIndex % layerColors.length];
  layerIndex++;

  const styles = createLayerStyle(color);

  const layer = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
      url: (extent) => {
        const fixed_extent = transformExtent(
          extent,
          "EPSG:3857",
          `EPSG:${EPSG_ID}`
        );
        return getWFSUrl(workspace, layerName, fixed_extent, EPSG_ID);
      },
      strategy: bboxStrategy,
    }),
    visible: false,
    style: function (feature) {
      const type = feature.getGeometry().getType();

      if (type === "Point" || type === "MultiPoint") {
        return styles.point;
      } else if (type === "LineString" || type === "MultiLineString") {
        return styles.line;
      }
      return styles.polygon;
    },
  });
  layer.set("layerName", layerName);

  return layer;
}
