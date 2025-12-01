import OSM from "ol/source/OSM";
import { Map, View } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import { scaleControl } from "./controls"; // Asegúrate de que la ruta sea correcta
import { CORRIENTES_TIENE_PAYE, workspace } from "../config/mapConst";
import { fetchLayersFromGeoServer } from "../api/geoserver";
import { createWFSLayer } from "./layerFactory";
import { preloadIcons } from "./icon_registry";

// Imports de UI (Opcional: podrías inicializar la UI fuera, pero aquí queda encapsulado)
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
    this.wfsLayers = []; // Guardamos referencia a las capas para poder buscarlas luego
    this.layersData = []; // La data cruda de las capas

    MapManager.instance = this;
  }

  // Método principal de inicialización
  async initialize() {
    if (this.map) return this.map; // Si ya existe, no reinicializar

    // 1. Precarga de iconos
    await preloadIcons();

    // 2. Capa Base
    const capaBaseOSM = new TileLayer({
      source: new OSM(),
    });

    // 3. Crear el Mapa
    this.map = new Map({
      controls: defaultControls().extend([scaleControl]),
      target: "map", // Asegúrate de que exista un <div id="map">
      view: new View({
        center: CORRIENTES_TIENE_PAYE,
        zoom: 12,
      }),
    });

    // 4. Cargar Capas desde GeoServer
    try {
      this.layersData = await fetchLayersFromGeoServer(workspace);

      // Mapeamos y guardamos la referencia en this.wfsLayers
      this.wfsLayers = this.layersData.map(([layerName, _, type]) =>
        createWFSLayer(layerName, type)
      );

      // Añadimos capas al mapa
      this.map.setLayers([capaBaseOSM, ...this.wfsLayers]);

      // 5. Inicializar UI
      // Al pasar 'this.map', pasamos la instancia única
      initLayerList(this.map, this.wfsLayers, this.layersData);
      initHtmlLegend(this.map, this.wfsLayers, this.layersData);
      initMapLegend(this.map, this.wfsLayers, this.layersData);
      initToolbar(this.map, this.wfsLayers, this.layersData);

      console.log("MapManager inicializado correctamente");
    } catch (error) {
      console.error("Error en MapManager:", error);
      throw error;
    }

    return this.map;
  }

  // --- MÉTODOS PÚBLICOS ---

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

// Exportamos una instancia única (const)
export const mapManager = new MapManager();
