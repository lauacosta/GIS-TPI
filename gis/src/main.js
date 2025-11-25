import OSM from "ol/source/OSM";
import { Map, View } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { fetchLayersFromGeoServer } from "./api/geoserver";
import { initLayerList } from "./ui/layerList";
import { initMapLegend } from "./ui/legendTable";
import { initHtmlLegend } from "./ui/legendTableHTML";
import { CORRIENTES_TIENE_PAYE, workspace } from "./config/mapConst";
import { createWFSLayer } from "./map/layerFactory";
import { initToolbar } from "./ui/toolbar";
import "ol/ol.css";
import TileLayer from "ol/layer/Tile.js";
import { preloadIcons } from "./map/icon_registry";
import { scaleControl } from "./map/controls";

await preloadIcons();

const capaBaseOSM = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  controls: defaultControls().extend([scaleControl]),
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
  initHtmlLegend(map, WFSlayers, layers);
  initMapLegend(map, WFSlayers, layers);

  initToolbar(map, WFSlayers, layers);
} catch (error) {
  console.error("Error iniciando la aplicación:", error);
}
