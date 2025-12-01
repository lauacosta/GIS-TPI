import { mapManager } from "./map/mapManager";
import "ol/ol.css";

(async () => {
  try {
    await mapManager.initialize();
  } catch (error) {
    console.error("Falló la inicialización de la app:", error);
  }
})();
