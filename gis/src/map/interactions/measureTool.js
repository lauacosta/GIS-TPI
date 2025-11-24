import { unByKey } from "ol/Observable.js";
import Overlay from "ol/Overlay.js";
import { getArea, getLength } from "ol/sphere.js";

import Draw from "ol/interaction/Draw.js";
import { LineString, Polygon, Point } from "ol/geom.js";
import { Vector as VectorSource } from "ol/source.js";
import { Vector as VectorLayer } from "ol/layer.js";
import Feature from "ol/Feature.js";

import {
  activeDrawStyle,
  measureLineStyle,
  measureToolTip,
  htmlSupToUnicode,
} from "../styles.js";

function createLabelFeature(coord, text) {
  const label = new Feature({
    geometry: new Point(coord),
    labelText: text,
  });
  const styles = measureToolTip(text);
  label.setStyle(styles);
  label.textStyle = styles[0].getText();
  return label;
}

export function createMeasureTool(map) {
  const source = new VectorSource();
  const vectorLayer = new VectorLayer({
    source: source,
    style: measureLineStyle,
    zIndex: 999,
  });

  map.addLayer(vectorLayer);

  let activeDraw = undefined;
  let activeType = undefined;
  let pointerMoveKey = undefined;
  let labelFeature = undefined;
  let sketch;
  let helpTooltipElement, helpTooltip;

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
      }
    }

    helpTooltipElement.innerHTML = helpMessage;
    helpTooltip.setPosition(event.coordinate);
    helpTooltipElement.classList.remove("hidden");
  };

  const formatLength = function (line) {
    const length = getLength(line);
    let output =
      length > 100
        ? Math.round((length / 1000) * 100) / 100 + " km"
        : Math.round(length * 100) / 100 + " m";
    return htmlSupToUnicode(output);
  };

  const formatArea = function (polygon) {
    const area = getArea(polygon);
    let output =
      area > 10_000
        ? Math.round((area / 1_000_000) * 100) / 100 + " km<sup>2</sup>"
        : Math.round(area * 100) / 100 + " m<sup>2</sup>";
    return htmlSupToUnicode(output);
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

    let listener;
    activeDraw.on("drawstart", function (event) {
      sketch = event.feature;

      listener = sketch.getGeometry().on("change", function (evt) {
        const geom = evt.target;
        let output, coord;

        if (geom instanceof Polygon) {
          output = formatArea(geom);
          coord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof LineString) {
          output = formatLength(geom);
          coord = geom.getLastCoordinate();
        }

        if (!labelFeature) {
          labelFeature = createLabelFeature(coord, output);
          source.addFeature(labelFeature);
        } else {
          labelFeature.getGeometry().setCoordinates(coord);
          labelFeature.textStyle.setText(output);
        }
      });
    });

    activeDraw.on("drawend", function () {
      labelFeature = undefined;
      sketch = undefined;
      helpMessage = startDrawingMessage;
      unByKey(listener);
    });

    map.addInteraction(activeDraw);
    pointerMoveKey = map.on("pointermove", pointerMoveHandler);
  }

  return {
    activate: (drawType) => {
      addDrawInteraction(drawType);
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

      source.clear();
    },
    finish: () => {
      if (activeDraw) {
        activeDraw.finishDrawing();
      }
    },
  };
}
