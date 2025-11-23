import Select from "ol/interaction/Select.js";
import DragBox from "ol/interaction/DragBox.js";
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
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
    measureToolTip,
    htmlSupToUnicode,
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

function createLabelFeature(coord, text) {
    const label = new Feature({
        geometry: new Point(coord),
        labelText: text,
    });
    const styles = measureToolTip(text);
    label.setStyle(styles)

    label.textStyle = styles[0].getText();

    return label;
}

export function createMeasureController(map) {
    let activeDraw = undefined;
    let activeType = undefined;
    let pointerMoveKey = undefined;
    let labelFeature = undefined;

    let sketch;
    let helpTooltipElement, helpTooltip;

    const continueLineMessage = "Click para seguir trazando la linea";
    const continuePolygonMessage = "Click para seguir trazando el poligono";
    const startDrawingMessage = "Click para empezar a dibujar";
    let helpMessage = startDrawingMessage;

    const pointerMoveHandler = function(event) {
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

    const formatLength = function(line) {
        const length = getLength(line);
        let output;
        output =
            length > 100
                ? Math.round((length / 1000) * 100) / 100 + " " + "km"
                : Math.round(length * 100) / 100 + " " + "m";
        // return output;
        return htmlSupToUnicode(output);
    };

    const formatArea = function(polygon) {
        const area = getArea(polygon);
        let output;
        output =
            area > 10_000
                ? Math.round((area / 1_000_000) * 100) / 100 + " " + "km<sup>2</sup>"
                : Math.round(area * 100) / 100 + " " + "m<sup>2</sup>";
        return htmlSupToUnicode(output);
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

        if (!helpTooltipElement) {
            createHelpTooltip(map);
        }

        let listener;
        activeDraw.on("drawstart", function(event) {
            sketch = event.feature;

            listener = sketch.getGeometry().on("change", function(event_) {
                const geom = event_.target;
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
                    labelFeature.textStyle.setText(output)
                }
            });
        });

        activeDraw.on("drawend", function() {
            labelFeature = undefined;
            sketch = undefined;
            helpMessage = startDrawingMessage;
            unByKey(listener);
        });

        map.addInteraction(activeDraw);
        pointerMoveKey = map.on("pointermove", pointerMoveHandler);
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
    style: function(feature) {
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
