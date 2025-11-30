import { unByKey } from "ol/Observable.js";
import Overlay from "ol/Overlay.js";
import Draw from "ol/interaction/Draw.js";
import { LineString, Polygon, Point } from "ol/geom.js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import Feature from "ol/Feature.js";
import { activeDrawStyle } from "../styles.js";
import { getSelectedLayer } from "../../ui/layerList.js";
import { insertFeatureWFST } from "../../api/geoserver.js";

export function createDrawTool(map) {
  const editSideBar = document.querySelector(".editing-side-menu");

  // Source y layer para features dibujadas (persistentes)
  const source = new VectorSource();
  const vectorLayer = new VectorLayer({
    source: source,
    style: activeDrawStyle,
    zIndex: 1000,
  });

  map.addLayer(vectorLayer);

  let activeDraw = undefined;
  let activeType = undefined;
  let pointerMoveKey = undefined;
  let sketch;
  let helpTooltipElement, helpTooltip;

  // Array para almacenar features dibujadas pendientes de guardar
  const drawnFeatures = [];

  const continuePointMessage = "Click para colocar un punto";
  const continueLineMessage = "Click para seguir trazando la línea";
  const continuePolygonMessage = "Click para seguir trazando el polígono";
  const startDrawingMessage = "Click para empezar a dibujar";
  let helpMessage = startDrawingMessage;

  const pointerMoveHandler = function (event) {
    if (event.dragging) return;

    if (sketch) {
      const geom = sketch.getGeometry();
      if (geom instanceof Polygon) {
        helpMessage = continuePolygonMessage;
      } else if (geom instanceof LineString) {
        helpMessage = continueLineMessage;
      } else if (geom instanceof Point) {
        helpMessage = continuePointMessage;
      }
    }

    helpTooltipElement.innerHTML = helpMessage;
    helpTooltip.setPosition(event.coordinate);
    helpTooltipElement.classList.remove("hidden");
  };

  function createHelpTooltip() {
    if (helpTooltipElement) {
      helpTooltipElement.remove();
    }
    helpTooltipElement = document.createElement("div");
    helpTooltipElement.className = "ol-tooltip hidden";
    helpTooltip = new Overlay({
      element: helpTooltipElement,
      offset: [15, 0],
      positioning: "center-left",
    });
    map.addOverlay(helpTooltip);
  }

  function addDrawInteraction(drawType) {
    drawType = drawType || "Polygon";

    if (activeType === drawType) return;

    if (activeDraw) {
      map.removeInteraction(activeDraw);
      activeDraw = null;
    }
    activeType = drawType;

    if (pointerMoveKey) unByKey(pointerMoveKey);

    activeDraw = new Draw({
      source: source,
      type: activeType,
      style: () => activeDrawStyle,
    });

    if (!helpTooltipElement) createHelpTooltip();

    activeDraw.on("drawstart", function (event) {
      sketch = event.feature;
      helpMessage =
        activeType === "Point"
          ? continuePointMessage
          : activeType === "LineString"
          ? continueLineMessage
          : continuePolygonMessage;
    });

    activeDraw.on("drawend", function (event) {
      const feature = event.feature;
      const selectedLayer = getSelectedLayer();

      // Verificar que haya una capa seleccionada al terminar de dibujar
      if (!selectedLayer) {
        console.warn(
          "No hay capa seleccionada, feature no tendrá información de capa"
        );
        alert(
          "Advertencia: No has seleccionado una capa. Este feature no se podrá guardar en la base de datos."
        );
      }

      // Agregar metadata al feature
      feature.setProperties({
        layerName: selectedLayer?.name || "unknown",
        workspace: selectedLayer?.workspace || "TPI_GIS",
        drawType: activeType,
        timestamp: new Date().toISOString(),
        saved: false, // Marca como no guardado en BD
      });

      // Agregar a la lista de features pendientes
      drawnFeatures.push(feature);

      console.log(
        `Feature dibujado (${activeType}). Total pendientes: ${drawnFeatures.length}`
      );

      sketch = undefined;
      helpMessage = startDrawingMessage;

      // NO limpiamos el source, las features permanecen visibles
    });

    map.addInteraction(activeDraw);
    pointerMoveKey = map.on("pointermove", pointerMoveHandler);
  }

  // Función para guardar TODAS las features pendientes en la BD
  async function saveAllFeatures() {
    if (drawnFeatures.length === 0) {
      alert("No hay features para guardar");
      return { success: false, error: "No hay features" };
    }

    const selectedLayer = getSelectedLayer();
    if (!selectedLayer) {
      alert("No hay una capa seleccionada");
      return { success: false, error: "No layer selected" };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const feature of drawnFeatures) {
      if (feature.get("saved")) continue; // Ya está guardado

      try {
        const geometry = feature.getGeometry();
        const result = await insertFeatureWFST(
          selectedLayer.workspace,
          selectedLayer.name,
          geometry
        );

        if (result.success) {
          feature.setProperties({ saved: true });
          successCount++;
        } else {
          errorCount++;
          errors.push(result.error);
        }
      } catch (error) {
        errorCount++;
        errors.push(error.message);
        console.error("Error guardando feature:", error);
      }
    }

    const message = `Guardados: ${successCount}, Errores: ${errorCount}`;

    if (successCount > 0) {
      // Limpiar features temporales
      clearSavedFeatures();

      alert(
        message +
          "\n\n✅ Los datos se guardaron correctamente en la base de datos.\n\n💡 Recarga la página (F5) para visualizar los cambios en el mapa."
      );

      console.log(
        `✅ ${successCount} feature(s) guardado(s) en la base de datos`
      );
    } else {
      alert(message);
    }

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      errors,
    };
  }

  // Función para limpiar SOLO los features guardados
  function clearSavedFeatures() {
    // Filtrar features no guardados
    const unsavedFeatures = drawnFeatures.filter((f) => !f.get("saved"));

    // Remover features guardados del source visual
    const allFeatures = source.getFeatures();
    allFeatures.forEach((feature) => {
      if (feature.get("saved")) {
        source.removeFeature(feature);
      }
    });

    // Actualizar el array
    drawnFeatures.length = 0;
    drawnFeatures.push(...unsavedFeatures);

    console.log(
      `Features guardados eliminados. Pendientes: ${drawnFeatures.length}`
    );
  }

  // Función para limpiar TODOS los dibujos
  function clearAllDrawings() {
    source.clear();
    drawnFeatures.length = 0;
    console.log("Todos los dibujos eliminados");
  }

  return {
    activate: (featureInfo) => {
      addDrawInteraction(featureInfo.geometryType);
      editSideBar.classList.add("active-edit-controls");
    },
    disable: () => {
      activeType = undefined;
      if (activeDraw) {
        map.removeInteraction(activeDraw);
        activeDraw = undefined;
      }
      if (pointerMoveKey) {
        unByKey(pointerMoveKey);
        pointerMoveKey = undefined;
      }
      if (helpTooltip) {
        map.removeOverlay(helpTooltip);
        helpTooltip = undefined;
        helpTooltipElement = undefined;
      }
      editSideBar.classList.remove("active-edit-controls");
    },
    finish: () => {
      if (activeDraw) {
        activeDraw.finishDrawing();
      }
    },

    saveAll: saveAllFeatures,
    clearSaved: clearSavedFeatures,
    clearAll: clearAllDrawings,
    getDrawnFeatures: () => drawnFeatures,
    getPendingCount: () => drawnFeatures.filter((f) => !f.get("saved")).length,
  };
}
