import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";
import { createMeasureController } from "../map/interactions";

export function initToolbar(map, interactionControls) {
    const dom = {
        center: document.querySelector("#centerInitialPos"),
        zoomout: document.querySelector("#zoom-out"),
        zoomin: document.querySelector("#zoom-in"),
        query: document.querySelector("#query"),
        draw: document.querySelector("#draw"),
        measure: document.querySelector("#measure"),
    };

    let measureMode = false;
    let queryMode = false;
    const measure_controller = createMeasureController(map);

    function handleCenterClick() {
        centerInitialPos(map.getView())
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

    function toggleMeasure() {
        if (measureMode) {
            measureMode = false;
            dom.measure.classList.remove("active");
            measure_controller.disable()
        } else {
            if (queryMode) {
                queryMode = false;
                dom.query.classList.remove("active");
                interactionControls.disableQueryMode();
            }
            measureMode = true;
            dom.measure.classList.add("active");
            measure_controller.activate("LineString")
        }
    }

    function toggleQuery() {
        if (queryMode) {
            queryMode = false;
            dom.query.classList.remove("active");
            interactionControls.disableQueryMode();
        } else {
            if (measureMode) {
                measureMode = false;
                dom.measure.classList.remove("active");
                measure_controller.disable()
            }
            queryMode = true;
            dom.query.classList.add("active");
            interactionControls.enableQueryMode();
        }
    }

    dom.center.addEventListener("click", handleCenterClick);
    dom.zoomout.addEventListener("click", handleZoomOutClick);
    dom.zoomin.addEventListener("click", handleZoomInClick);
    dom.draw.addEventListener("click", handleDrawClick);

    if (dom.measure) {
        function handleMeasureClick() {
            toggleMeasure();
        }

        function handleMeasureKeydown(event) {
            if (event.key === "m" || (event.key === "Escape" && measureMode)) {
                toggleMeasure();
            }
        }

        function handleMeasureTypeKeydown(event) {
            if (!measureMode) return;

            if (event.key === "l") {
                measure_controller.activate("LineString");
            }

            if (event.key === "p") {
                measure_controller.activate("Polygon");
            }
        }

        dom.measure.addEventListener("click", handleMeasureClick);
        globalThis.addEventListener("keydown", handleMeasureKeydown);
        globalThis.addEventListener("keydown", handleMeasureTypeKeydown);

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

