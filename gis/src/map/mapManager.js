import OSM from "ol/source/OSM";
import { Map, View } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import { scaleControl } from "./defaultControls"; // Asegúrate de que la ruta sea correcta
import { CORRIENTES_TIENE_PAYE, workspace } from "../config/mapConst";
import { fetchLayersFromGeoServer } from "../api/geoserver";
import { createWFSLayer } from "./layerFactory";
import { preloadIcons } from "./layerIcons";

import { initLayerList } from "../ui/layerList";
import { initMapLegend } from "../ui/legendTable";
import { initHtmlLegend } from "../ui/legendTableHTML";
import { initToolbar } from "../ui/toolbar";

class MapManager {
  constructor() {
    if (MapManager.instance) {
      return MapManager.instance;
    }

    this.map = null;
    this.wfsLayers = [];
    this.layersData = [];

    MapManager.instance = this;
  }

  async initialize() {
    if (this.map) return this.map;

    await preloadIcons();

    const capaBaseOSM = new TileLayer({
      source: new OSM(),
    });

    this.map = new Map({
      controls: defaultControls().extend([scaleControl]),
      target: "map",
      view: new View({
        center: CORRIENTES_TIENE_PAYE,
        zoom: 12,
      }),
    });

    try {
      this.layersData = await fetchLayersFromGeoServer(workspace);

      this.wfsLayers = this.layersData.map(([layerName, _, type]) =>
        createWFSLayer(layerName, type)
      );

      this.map.setLayers([capaBaseOSM, ...this.wfsLayers]);

      initLayerList(this.map, this.wfsLayers, this.layersData);
      initHtmlLegend(this.map, this.wfsLayers, this.layersData);
      initMapLegend(this.map, this.wfsLayers, this.layersData);
      initToolbar(this.map, this.wfsLayers, this.layersData);
    } catch (error) {
      console.error("Error en MapManager:", error);
      throw error;
    }

    return this.map;
  }

  getMap() {
    return this.map;
  }

  refreshAllLayers() {
    if (!this.map) return;

    this.wfsLayers.forEach((layer) => {
      const source = layer.getSource();

      if (source) {
        source.clear();

        source.refresh();
      }
    });
  }
}

export const mapManager = new MapManager();
