import { unByKey } from "ol/Observable.js";
import Overlay from "ol/Overlay.js";
import Draw from "ol/interaction/Draw.js";
import { LineString, Polygon, Point } from "ol/geom.js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import Feature from "ol/Feature.js";
import { activeDrawStyle } from "../mapStyles.js";
import { getSelectedLayer } from "../../ui/layerList.js";
import { insertFeatureWFST } from "../../api/geoserver.js";
import { showToast } from "../../utils/toast.js";
import { mapManager } from "../mapManager.js";

export function createDrawTool(map) {
  const editSideBar = document.querySelector(".editing-side-menu");

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

      if (!selectedLayer) {
        console.warn(
          "No hay capa seleccionada, feature no tendrá información de capa"
        );
      }

      feature.setProperties({
        layerName: selectedLayer?.name || "unknown",
        workspace: selectedLayer?.workspace || "TPI_GIS",
        drawType: activeType,
        timestamp: new Date().toISOString(),
        saved: false,
      });

      drawnFeatures.push(feature);

      console.log(
        `Feature dibujado (${activeType}). Total pendientes: ${drawnFeatures.length}`
      );

      sketch = undefined;
      helpMessage = startDrawingMessage;
    });

    map.addInteraction(activeDraw);
    pointerMoveKey = map.on("pointermove", pointerMoveHandler);
  }

  function showConfirmModal() {
    const modal = document.getElementById("simple-modal");
    const btnSave = document.getElementById("modal-btn-save");
    const btnCancel = document.getElementById("modal-btn-cancel");
    const btnClose = document.getElementById("modal-btn-close"); // Si tienes botón de cerrar X

    // Validación de seguridad
    if (drawnFeatures.length === 0) return;

    modal.classList.add("active");

    // --- BOTÓN GUARDAR ---
    btnSave.onclick = async () => {
      // 1. Feedback visual en el botón
      btnSave.disabled = true;
      const originalText = btnSave.textContent;
      btnSave.textContent = "Guardando...";

      // 2. Ejecutar guardado (Esto ya limpia el array y el mapa si sale bien)
      const result = await saveAllFeatures();

      // 3. Restaurar botón y cerrar modal
      modal.classList.remove("active");
      btnSave.disabled = false;
      btnSave.textContent = originalText;

    };

    // --- BOTÓN CANCELAR ---
    btnCancel.onclick = () => {
      modal.classList.remove("active");

      // Si cancela, borramos todo lo dibujado para que no quede basura en el mapa
      // sobre la nueva herramienta que el usuario seleccionó.
      clearAllDrawings();
    };

    // --- BOTÓN CERRAR (X) ---
    if (btnClose) {
      btnClose.onclick = () => {
        modal.classList.remove("active");
       
        clearAllDrawings();
      };
    }
  }

  async function saveAllFeatures() {
    if (drawnFeatures.length === 0) {
      showToast("No hay features para guardar", "info");
      return { success: false, error: "No hay features" };
    }

    const selectedLayer = getSelectedLayer();
    if (!selectedLayer) {
      return { success: false, error: "No layer selected" };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const feature of drawnFeatures) {
      if (feature.get("saved")) continue;

      const featureLayerName = feature.get("layerName");
      const featureWorkspace = feature.get("workspace");

      if (!featureLayerName || !featureWorkspace) {
        errorCount++;
        errors.push("Feature sin información de capa");
        continue;
      }

      try {
        const geometry = feature.getGeometry();
        const result = await insertFeatureWFST(
          featureWorkspace,
          featureLayerName,
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

    if (successCount > 0) {
      clearSavedFeatures();

      showToast(
        `${successCount} elemento(s) guardado(s) correctamente en la base de datos.`,
        "success",
        6000
      );

      
      mapManager.refreshAllLayers();
    } else {
      showToast(
        `No se pudieron guardar los elementos. ${errors.join(", ")}`,
        "error",
        6000
      );
    }

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      errors,
    };
  }

  function clearSavedFeatures() {
    const unsavedFeatures = drawnFeatures.filter((f) => !f.get("saved"));

    const allFeatures = source.getFeatures();
    allFeatures.forEach((feature) => {
      if (feature.get("saved")) {
        source.removeFeature(feature);
      }
    });

    drawnFeatures.length = 0;
    drawnFeatures.push(...unsavedFeatures);

    console.log(
      `Features guardados eliminados. Pendientes: ${drawnFeatures.length}`
    );
  }

  function clearAllDrawings() {
    source.clear();
    drawnFeatures.length = 0;
    showToast(`Se han eliminado todos los cambios`, "success", 6000);
  }

  function undoLast() {
    if (drawnFeatures.length === 0) {
      console.log("No hay dibujos para deshacer");
      return { success: false, message: "No hay dibujos" };
    }

    const lastFeature = drawnFeatures[drawnFeatures.length - 1];

    if (lastFeature.get("saved")) {
      console.log("El último feature ya fue guardado, no se puede deshacer");
      return {
        success: false,
        message: "El último dibujo ya está guardado en BD",
      };
    }

    drawnFeatures.pop();

    source.removeFeature(lastFeature);

    console.log(`Feature eliminado. Pendientes: ${drawnFeatures.length}`);
    return {
      success: true,
      remaining: drawnFeatures.length,
    };
  }

  function setupEditingButtons(onCancelCallback) {
    const saveBtn = document.querySelector("#save-edit");
    const undoBtn = document.querySelector("#go-back-action");
    const clearBtn = document.querySelector("#borrar-todo");
    const cancelBtn = document.querySelector("#cancel-edit");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveAllFeatures();
      });
    }

    if (undoBtn) {
      undoBtn.addEventListener("click", () => {
        const result = undoLast();
        if (!result.success && result.message) {
          console.warn(result.message);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        const pending = drawnFeatures.filter((f) => !f.get("saved")).length;
        if (pending > 0) {
          if (confirm) {
            clearAllDrawings();
          }
        } else {
          clearSavedFeatures();
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (onCancelCallback) {
          onCancelCallback();
        }
      });
    }
  }

  let cancelCallback = null;

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

      if (drawnFeatures.length > 0) {
        showConfirmModal();
      } else {
        source.clear();
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

    undo: undoLast,
    getDrawnFeatures: () => drawnFeatures,
    getPendingCount: () => drawnFeatures.filter((f) => !f.get("saved")).length,

    setCancelCallback: (callback) => {
      cancelCallback = callback;
      setupEditingButtons(callback);
    },
  };
}
