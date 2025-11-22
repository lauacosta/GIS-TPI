"use strict"

import { LineString } from "ol/geom";
import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";
import { createMeasureController } from "../map/interactions";

const Mode = Object.freeze({
    LineString: "LineString",
    Polygon: "Polygon",
});

function matchMode(value, patterns) {
    const handler = patterns[value];
    if (!handler) throw new Error("No match for " + value);
    return handler();
}

let currentMeasureType = null;

export function initToolbar(map, interactionControls) {
    const dom = {
        center: document.querySelector("#centerInitialPos"),
        zoomout: document.querySelector("#zoom-out"),
        zoomin: document.querySelector("#zoom-in"),
        query: document.querySelector("#query"),
        draw: document.querySelector("#draw"),
        measurePolygon: document.querySelector("#measure-polygon"),
        measureLine: document.querySelector("#measure-line"),
    };

    let measureMode = false;
    let queryMode = false;
    const measure_controller = createMeasureController(map);

    function handleCenterClick() {
        centerInitialPos(map.getView());
    }

    function handleZoomOutClick() {
        zoomOut(map.getView());
    }

    function handleZoomInClick() {
        zoomIn(map.getView());
    }

    function handleDrawClick() {
        alert("CHAQUE. Aún no esta implementado. Anda a UI/toolbar");
    }

    function toggleQuery() {
        if (queryMode) {
            queryMode = false;
            dom.query.classList.remove("active");
            interactionControls.disableQueryMode();
        } else {
            if (measureMode) {
                measureMode = false;
                dom.measureLine.classList.remove("active");
                measure_controller.disable();
            }
            queryMode = true;
            dom.query.classList.add("active");
            interactionControls.enableQueryMode();
        }
    }

    function toggleMeasureModes(mode) {
        if (measureMode) {
            if (mode === currentMeasureType) {
                measureMode = false;
                matchMode(currentMeasureType, {
                    LineString: () => {
                        dom.measureLine.classList.remove("active");
                    },
                    Polygon: () => {
                        dom.measurePolygon.classList.remove("active");
                    }
                })
                currentMeasureType = mode;
                measure_controller.disable();
                return;
            }

            matchMode(currentMeasureType, {
                LineString: () => dom.measureLine.classList.remove("active"),
                Polygon: () => dom.measurePolygon.classList.remove("active")
            });

            matchMode(mode, {
                LineString: () => dom.measureLine.classList.add("active"),
                Polygon: () => dom.measurePolygon.classList.add("active")
            });
            currentMeasureType = mode;

            measure_controller.activate(mode);
        } else {
            if (queryMode) {
                queryMode = false;
                dom.query.classList.remove("active");
                interactionControls.disableQueryMode();
            }
            measureMode = true;
            currentMeasureType = mode

            matchMode(mode, {
                LineString: () => {
                    dom.measureLine.classList.add("active");
                },
                Polygon: () => {
                    dom.measurePolygon.classList.add("active");
                }
            })
            measure_controller.activate(mode);
        }
    }


    dom.center.addEventListener("click", handleCenterClick);
    dom.zoomout.addEventListener("click", handleZoomOutClick);
    dom.zoomin.addEventListener("click", handleZoomInClick);
    dom.draw.addEventListener("click", handleDrawClick);

    function handleMeasureKeydown(event) {
        if (event.key === "l") {
            toggleMeasureModes(Mode.LineString);
            return;
        }
        if (event.key === "p") {
            toggleMeasureModes(Mode.Polygon);
            return;
        }

        if (!measureMode) return;

        if (event.key === "Escape") {
            toggleMeasureModes(currentMeasureType);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            measure_controller.finish();
        }
    }


    if (dom.measureLine) {
        function handleMeasureClick() {
            toggleMeasureModes(Mode.LineString);
        }

        //         function handleMeasureKeydown(event) {
        //             if (event.key === "l" || (event.key === "Escape" && measureMode)) {
        //                 toggleMeasureModes(Mode.LineString);
        //             }
        //             if (measureMode && event.key === "Enter") {
        //                 event.preventDefault();
        //                 measure_controller.finish();
        //             }
        //         }

        dom.measureLine.addEventListener("click", handleMeasureClick);
        globalThis.addEventListener("keydown", handleMeasureKeydown);
    }

    if (dom.measurePolygon) {
        function handleMeasureClick() {
            toggleMeasureModes(Mode.Polygon);
        }

        dom.measurePolygon.addEventListener("click", handleMeasureClick);
        globalThis.addEventListener("keydown", handleMeasureKeydown);
    }


    if (dom.query) {
        function handleQueryClick() {
            toggleQuery();
        }

        function handleQueryKeydown(event) {
            if (event.key === "f" || (event.key === "Escape" && queryMode)) {
                toggleQuery();
            }
        }

        dom.query.addEventListener("click", handleQueryClick);
        globalThis.addEventListener("keydown", handleQueryKeydown);
    }
}
