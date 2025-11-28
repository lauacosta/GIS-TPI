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
} from "../styles.js";
import { getSelectionStyleForFeature } from "../icon_registry.js";

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
  });

  dragBoxInteraction.on("boxstart", () => {
    selectInteraction.getFeatures().clear();

    isDrawing = true;
    helpMessage = dragMessage;
  });
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
    },
  };
}
