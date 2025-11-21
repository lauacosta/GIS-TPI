import Select from "ol/interaction/Select.js";
import DragBox from "ol/interaction/DragBox.js";
import { platformModifierKeyOnly } from "ol/events/condition.js";
import { getFeaturesInDragBox } from "../utils/dragBoxQuery";
import { updateTabs } from "../ui/tableList";
import VectorSource from "ol/source/Vector.js";
import {
  selectedPointStyle,
  selectedLineStyle,
  selectedPolygonStyle,
  activeDrawStyle,
  measureLineStyle,
} from "./styles.js";
import { unByKey } from "ol/Observable.js";
import Overlay from "ol/Overlay.js";
import LineString from "ol/geom/LineString.js";
import Polygon from "ol/geom/Polygon.js";
import Draw from "ol/interaction/Draw.js";
import { getArea, getLength } from "ol/sphere.js";
import VectorLayer from "ol/layer/Vector.js";

// WARN:GLOBAL
const source = new VectorSource();

export function createMeasureController(map) {
  let activeDraw = undefined;
  let activeType = undefined;
  let pointerMoveKey = undefined;
  let measureOverlays = [];

  let sketch;
  let helpTooltipElement, helpTooltip;
  let measureTooltipElement, measureTooltip;

  const continueLineMessage = "Click para seguir trazando la linea";
  const continuePolygonMessage = "Click para seguir trazando el poligono";
  let helpMessage = "Click para empezar a dibujar";

  const hideTooltip = () => helpTooltipElement.classList.add("hidden");
  const pointerMoveHandler = function (event) {
    if (event.dragging) {
      return;
    }

    if (sketch) {
      const geom = sketch.getGeometry();
      if (geom instanceof Polygon) {
        helpMessage = continuePolygonMessage;
      } else if (geom instanceof LineString) {
        helpMessage = continueLineMessage;
      }
    }

    helpTooltipElement.innerHTML = helpMessage;
    helpTooltip.setPosition(event.coordinate);

    helpTooltipElement.classList.remove("hidden");
  };

  const formatLength = function (line) {
    const length = getLength(line);
    let output;
    output =
      length > 100
        ? Math.round((length / 1000) * 100) / 100 + " " + "km"
        : Math.round(length * 100) / 100 + " " + "m";
    return output;
  };

  const formatArea = function (polygon) {
    const area = getArea(polygon);
    let output;
    output =
      area > 10_000
        ? Math.round((area / 1_000_000) * 100) / 100 + " " + "km<sup>2</sup>"
        : Math.round(area * 100) / 100 + " " + "m<sup>2</sup>";
    return output;
  };

  function addDrawInteraction(map, drawType) {
    drawType = drawType ? drawType : "Polygon";
    if (activeType === drawType) {
      return;
    }

    if (activeDraw) {
      map.removeInteraction(activeDraw);
      activeDraw = null;
    }
    activeType = drawType;

    if (pointerMoveKey) {
      unByKey(pointerMoveKey);
    }

    activeDraw = new Draw({
      source: source,
      type: activeType,
      style: () => activeDrawStyle,
    });

    createMeasureTooltip(map);

    if (!helpTooltipElement) {
      createHelpTooltip(map);
    }

    let listener;
    activeDraw.on("drawstart", function (event) {
      sketch = event.feature;

      let tooltipCoord;

      listener = sketch.getGeometry().on("change", function (event_) {
        const geom = event_.target;
        let output;
        if (geom instanceof Polygon) {
          output = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof LineString) {
          output = formatLength(geom);
          tooltipCoord = geom.getLastCoordinate();
        }
        measureTooltipElement.innerHTML = output;
        measureTooltip.setPosition(tooltipCoord);
      });
    });

    activeDraw.on("drawend", function () {
      measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
      measureTooltip.setOffset([0, -7]);
      // unset sketch
      sketch = undefined;
      // unset tooltip so that a new one can be created
      measureTooltipElement = null;
      createMeasureTooltip(map);
      unByKey(listener);
    });

    map.addInteraction(activeDraw);
    pointerMoveKey = map.on("pointermove", pointerMoveHandler);
    map.getViewport().addEventListener("mouseout", hideTooltip);
  }

  function createHelpTooltip(map) {
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

  function createMeasureTooltip(map) {
    if (measureTooltipElement) {
      measureTooltipElement.remove();
    }
    measureTooltipElement = document.createElement("div");
    measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";
    measureTooltip = new Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: "bottom-center",
      stopEvent: false,
      insertFirst: false,
    });
    map.addOverlay(measureTooltip);
    measureOverlays.push(measureTooltip);
  }

  return {
    activate: (drawType) => {
      addDrawInteraction(map, drawType);
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

      if (measureTooltip) {
        map.removeOverlay(measureTooltip);
        measureTooltip = undefined;
        measureTooltipElement = undefined;
      }

      map.getViewport().removeEventListener("mouseout", hideTooltip);

      for (const ov of measureOverlays) {
        const el = ov.getElement();
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
        map.removeOverlay(ov);
      }
      source.clear();
    },
    finish: () => {
      if (activeDraw) {
        activeDraw.finishDrawing();
      }
    },
  };
}

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

  const measureLayer = new VectorLayer({
    source: source,
    style: measureLineStyle,
  });

  map.addLayer(measureLayer);

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
