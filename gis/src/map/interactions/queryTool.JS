import Select from "ol/interaction/Select.js";
import DragBox from "ol/interaction/DragBox.js";
import { platformModifierKeyOnly } from "ol/events/condition.js";
import { getFeaturesInDragBox } from "../../utils/dragBoxQuery";
import { updateTabs } from "../../ui/tableList";
import {
  selectedPointStyle,
  selectedLineStyle,
  selectedPolygonStyle,
} from "../styles.js";

export function createQueryTool(map, layersWFS) {
  const selectInteraction = new Select({
    style: function (feature) {
      const geom = feature && feature.getGeometry && feature.getGeometry();
      const type = geom && geom.getType && geom.getType();
      if (type === "Point" || type === "MultiPoint") {
        return selectedPointStyle;
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
    }

    updateTabs(selectedFeatures);
  });

  dragBoxInteraction.on("boxstart", () => {
    selectInteraction.getFeatures().clear();
  });

  return {
    enable: () => {
      map.addInteraction(selectInteraction);
      map.addInteraction(dragBoxInteraction);
    },
    disable: () => {
      map.removeInteraction(selectInteraction);
      map.removeInteraction(dragBoxInteraction);
      selectInteraction.getFeatures().clear();
    },
  };
}
