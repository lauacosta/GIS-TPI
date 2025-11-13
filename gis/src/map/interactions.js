import Select from "ol/interaction/Select.js";
import DragBox from "ol/interaction/DragBox.js";
import { platformModifierKeyOnly } from "ol/events/condition.js";
import { getFeaturesInDragBox } from "../utils/dragBoxQuery";
import { updateTabs } from "../ui/tabs";

import { selectedStyle, selectedPointStyle } from "./styles";

const selectInteraction = new Select({
  // Define el estilo de la capa al ser seleccionada
  style: function (feature) {
    const geom = feature && feature.getGeometry && feature.getGeometry();
    const type = geom && geom.getType && geom.getType();
    if (type === "Point" || type === "MultiPoint") return selectedPointStyle;
    return selectedStyle;
  },
});

const dragBoxInteraction = new DragBox({
  condition: platformModifierKeyOnly,
});

export function setupInteractions(map, layersWFS) {
  dragBoxInteraction.on("boxend", () => {
    const selectedFeatures = getFeaturesInDragBox(
      dragBoxInteraction,
      map,
      layersWFS
    );

    selectInteraction.getFeatures().clear();
    if (selectedFeatures.length > 0) {
      selectInteraction.getFeatures().extend(selectedFeatures);
    }

    updateTabs(selectedFeatures);
  });

  dragBoxInteraction.on("boxstart", () => {
    selectInteraction.getFeatures().clear();
  });

  return {
    enableQueryMode: () => {
      map.addInteraction(selectInteraction);
      map.addInteraction(dragBoxInteraction);
    },
    disableQueryMode: () => {
      map.removeInteraction(selectInteraction);
      map.removeInteraction(dragBoxInteraction);
      selectInteraction.getFeatures().clear();
    },
  };
}
