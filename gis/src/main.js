import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { Map, View } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { setupInteractions } from "./map/interactions";
import { fetchLayersFromGeoServer } from "./api/geoserver";
import { scaleControl } from "./map/controls";
import { initSidebar } from "./ui/siderbar";
import { initLayerList } from "./ui/layerList";
import { CORRIENTES_TIENE_PAYE, workspace, EPSG_ID } from "./config/mapConst";
import { createWFSLayer } from "./map/layerFactory";
import { initToolbar } from "./ui/toolbar";

const capaBaseOSM = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  controls: defaultControls().extend([scaleControl()]),
  target: "map",
  view: new View({
    // projection: `EPSG:${EPSG_ID}`,
    center: CORRIENTES_TIENE_PAYE,
    zoom: 12,
  }),
});

async function init_map() {
  try {
    const layers = await fetchLayersFromGeoServer(workspace);
    const WFSlayers = layers.map(([layerName]) => createWFSLayer(layerName));

    map.setLayers([capaBaseOSM, ...WFSlayers]);
    const mapControls = setupInteractions(map, WFSlayers);

    initSidebar();
    initLayerList(layers, WFSlayers);
    initToolbar(map, mapControls);
  } catch (error) {
    console.error("Error iniciando la aplicación:", error);
  }
}

init_map();
