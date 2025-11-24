import OSM from "ol/source/OSM";
import { Map, View } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { fetchLayersFromGeoServer } from "./api/geoserver";
import ScaleLine from "ol/control/ScaleLine.js";
import { initLayerList } from "./ui/layerList";
import { initMapLegend } from "./ui/legendTable";
import { CORRIENTES_TIENE_PAYE, workspace } from "./config/mapConst";
import { createWFSLayer } from "./map/layerFactory";
import { initToolbar } from "./ui/toolbar";
import "ol/ol.css";
import Rotate from "ol/control/Rotate.js";
import TileLayer from "ol/layer/Tile.js";
import { preloadIcons } from "./map/icon_registry";

await preloadIcons();

const capaBaseOSM = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  controls: defaultControls().extend([
    new Rotate({
      autoHide: false,
    }),
    new ScaleLine({
      units: "metric",
      steps: 4,
      text: true,
      minWidth: 140,
    }),
  ]),
  target: "map",
  view: new View({
    center: CORRIENTES_TIENE_PAYE,
    zoom: 12,
  }),
});

try {
  const layers = await fetchLayersFromGeoServer(workspace);
  const WFSlayers = layers.map(([layerName, _, type]) =>
    createWFSLayer(layerName, type)
  );

  map.setLayers([capaBaseOSM, ...WFSlayers]);
  initLayerList(layers, WFSlayers);
  initMapLegend(map, WFSlayers, layers);

  initToolbar(map, WFSlayers, layers);
} catch (error) {
  console.error("Error iniciando la aplicación:", error);
}
