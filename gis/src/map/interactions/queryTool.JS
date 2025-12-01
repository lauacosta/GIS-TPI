import Select from "ol/interaction/Select.js";
import DragBox from "ol/interaction/DragBox.js";
import { platformModifierKeyOnly } from "ol/events/condition.js";
import Overlay from "ol/Overlay.js";
import { unByKey } from "ol/Observable.js";
import { getFeaturesInDragBox } from "../../utils/dragBoxQuery";
import { updateTabs } from "../../ui/tableList";

import {
  // selectedPointStyle,
  selectedLineStyle,
  selectedPolygonStyle,
} from "../mapStyles.js";
import { getSelectionStyleForFeature } from "../layerIcons.js";
import { deleteFeatureWFST } from "../../api/geoserver.js";
import { workspace } from "../../config/mapConst.js";

export function createQueryTool(map, layersWFS) {
  let helpTooltipElement;
  let helpTooltip;
  let pointerMoveKey;

  const startMessage = "Mantené Ctrl + Arrastrá para seleccionar";
  const dragMessage = "Suelta el mouse para terminar";

  let helpMessage = startMessage;
  let isDrawing = false;

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

  const pointerMoveHandler = function (event) {
    if (event.dragging && !isDrawing) {
      helpTooltipElement.classList.add("hidden");
      return;
    }
    helpTooltipElement.innerHTML = helpMessage;

    helpTooltip.setPosition(event.coordinate);
    helpTooltipElement.classList.remove("hidden");
  };

  const selectInteraction = new Select({
    style: function (feature) {
      const geom = feature && feature.getGeometry && feature.getGeometry();
      const type = geom && geom.getType && geom.getType();
      if (type === "Point" || type === "MultiPoint") {
        return getSelectionStyleForFeature(feature);
      } else if (type === "LineString" || type === "MultiLineString") {
        return selectedLineStyle;
      }
      return selectedPolygonStyle;
    },
  });

  const dragBoxInteraction = new DragBox({
    condition: platformModifierKeyOnly,
  });

  // Crear el botón flotante de eliminación
  let deleteButton = document.querySelector(".delete-features-button");
  if (!deleteButton) {
    deleteButton = createDeleteButton();
    document.body.appendChild(deleteButton);
  }

  // Actualizar visibilidad del botón cuando cambia la selección
  selectInteraction.on("select", () => {
    updateDeleteButton();
  });

  function updateDeleteButton() {
    const count = selectInteraction.getFeatures().getLength();
    if (count > 0) {
      deleteButton.classList.add("visible");
      const countElement = deleteButton.querySelector(".count");
      if (countElement) {
        countElement.textContent = `${count} feature${
          count > 1 ? "s" : ""
        } seleccionada${count > 1 ? "s" : ""}`;
      }
    } else {
      deleteButton.classList.remove("visible");
    }
  }

  function createDeleteButton() {
    const button = document.createElement("button");
    button.className = "delete-features-button";
    button.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" 
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="text">
        <span class="label">Eliminar selección</span>
        <span class="count">0 features seleccionadas</span>
      </div>
      <span class="badge-delete">B</span>
    `;

    button.addEventListener("click", () => {
      deleteSelectedFeatures();
    });

    return button;
  }

  dragBoxInteraction.on("boxend", () => {
    const selectedFeatures = getFeaturesInDragBox(
      dragBoxInteraction,
      map,
      layersWFS
    );

    selectInteraction.getFeatures().clear();

    if (selectedFeatures.length > 0) {
      selectInteraction.getFeatures().extend(selectedFeatures);
      updateTabs(selectedFeatures);
      const tablesBtn = document.querySelector('[data-target="tables"]');
      if (tablesBtn) tablesBtn.click();

      const layersList = document.getElementById("selected-layers");
      if (layersList) {
        const firstLayerBtn = layersList.querySelector(".layer-btn");

        if (firstLayerBtn) {
          firstLayerBtn.click();
        }
      }
    }

    isDrawing = false;
    helpMessage = startMessage;
    updateDeleteButton();
  });

  dragBoxInteraction.on("boxstart", () => {
    selectInteraction.getFeatures().clear();

    isDrawing = true;
    helpMessage = dragMessage;
    updateDeleteButton();
  });

  // Función para eliminar features seleccionadas
  async function deleteSelectedFeatures() {
    const selectedFeatures = selectInteraction.getFeatures().getArray();

    if (selectedFeatures.length === 0) {
      showToast(
        "info",
        "No hay selección",
        "Selecciona features con la herramienta de consulta antes de eliminar."
      );
      return { success: false, message: "No selection" };
    }

    // Mostrar modal de confirmación
    const confirmed = await showDeleteConfirmationModal(selectedFeatures);

    if (!confirmed) {
      return { success: false, message: "Cancelled by user" };
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const feature of selectedFeatures) {
      try {
        const featureId = feature.getId();

        if (!featureId) {
          console.warn("Feature sin ID, no se puede eliminar", feature);
          errorCount++;
          errors.push("Feature sin ID");
          continue;
        }

        // Extraer el nombre de la capa del featureId (ej: "isla.1" -> "isla")
        const layerName = featureId.split(".")[0];

        const result = await deleteFeatureWFST(workspace, layerName, featureId);

        if (result.success) {
          // Remover la feature del mapa
          const layer = layersWFS.find((l) => l.get("layerName") === layerName);
          if (layer) {
            const source = layer.getSource();
            source.removeFeature(feature);
          }
          successCount++;
        } else {
          errorCount++;
          errors.push(result.error);
        }
      } catch (error) {
        errorCount++;
        errors.push(error.message);
        console.error("Error eliminando feature:", error);
      }
    }

    // Limpiar selección
    selectInteraction.getFeatures().clear();
    updateDeleteButton();

    if (successCount > 0) {
      showToast(
        "success",
        "Features eliminadas correctamente",
        `${successCount} feature${successCount > 1 ? "s" : ""} eliminada${
          successCount > 1 ? "s" : ""
        }.`
      );
    } else {
      showToast(
        "error",
        "Error al eliminar",
        errorCount > 0
          ? `No se pudo eliminar ninguna feature. ${errors[0] || ""}`
          : "No se encontraron features para eliminar."
      );
    }

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      errors,
    };
  }

  // Función para mostrar notificaciones toast
  function showToast(type, title, message) {
    // Crear toast
    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg class="toast-icon success" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    } else if (type === "error") {
      iconSvg = `<svg class="toast-icon error" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    } else {
      iconSvg = `<svg class="toast-icon info" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    document.body.appendChild(toast);

    // Mostrar con animación
    setTimeout(() => toast.classList.add("show"), 10);

    // Ocultar después de 5 segundos
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // Función para mostrar modal de confirmación de eliminación
  function showDeleteConfirmationModal(features) {
    return new Promise((resolve) => {
      const count = features.length;
      const featureWord = count === 1 ? "feature" : "features";

      // Crear modal si no existe
      let modal = document.querySelector(".delete-confirmation-modal");
      if (!modal) {
        modal = createDeleteModal();
        document.body.appendChild(modal);
      }

      // Lista de features con sus IDs
      const featureList = features
        .map((f) => {
          const id = f.getId() || "sin ID";
          const layerName = id.split(".")[0];
          return `<li>• ${layerName} (${id})</li>`;
        })
        .join("");

      const modalBody = modal.querySelector(".delete-modal-body");
      modalBody.innerHTML = `
        <div class="delete-warning">
          <strong>ADVERTENCIA:</strong> Esta acción no se puede deshacer. Los datos se eliminarán permanentemente de la base de datos.
        </div>
        <div class="delete-features-list">
          <h3>Se eliminarán ${count} ${featureWord}:</h3>
          <ul>${featureList}</ul>
        </div>
      `;

      // Mostrar modal
      modal.classList.add("active");

      // Event listeners

      const cancelBtn = modal.querySelector(".delete-modal-button-cancel");
      const confirmBtn = modal.querySelector(".delete-modal-button-confirm");

      const closeModal = () => {
        modal.classList.remove("active");
        resolve(false);
      };

      const confirmDelete = () => {
        modal.classList.remove("active");
        resolve(true);
      };

      cancelBtn.onclick = closeModal;
      confirmBtn.onclick = confirmDelete;

      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };
    });
  }

  // Crear elemento del modal
  function createDeleteModal() {
    const modal = document.createElement("div");
    modal.className = "delete-confirmation-modal";
    modal.innerHTML = `
      <div class="delete-modal-content">
        <div class="delete-modal-header">
          <h2>Confirmar Eliminación</h2>
         
        </div>
        <div class="delete-modal-body"></div>
        <div class="delete-modal-footer">
          <button class="delete-modal-button delete-modal-button-cancel btn-cancel">Cancelar</button>
          <button class="delete-modal-button delete-modal-button-confirm btn-confirm">Eliminar</button>
        </div>
      </div>
    `;
    return modal;
  }

  return {
    enable: () => {
      map.addInteraction(selectInteraction);
      map.addInteraction(dragBoxInteraction);
      createHelpTooltip();
      pointerMoveKey = map.on("pointermove", pointerMoveHandler);
    },
    disable: () => {
      map.removeInteraction(selectInteraction);
      map.removeInteraction(dragBoxInteraction);
      selectInteraction.getFeatures().clear();
      if (pointerMoveKey) {
        unByKey(pointerMoveKey);
        pointerMoveKey = undefined;
      }

      if (helpTooltip) {
        map.removeOverlay(helpTooltip);
        helpTooltip = undefined;
        helpTooltipElement = undefined;
      }
      deleteButton.classList.remove("visible");
    },
    deleteSelected: deleteSelectedFeatures,
    getSelectedFeatures: () => selectInteraction.getFeatures().getArray(),
    getSelectedCount: () => selectInteraction.getFeatures().getLength(),
  };
}
