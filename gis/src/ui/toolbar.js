import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";

// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
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
            // Disable measure mode
            measureMode = false;
            dom.measure.classList.remove("active");
            interactionControls.disableMeasureMode();
        } else {
            // Disable query mode if active, then enable measure
            if (queryMode) {
                queryMode = false;
                dom.query.classList.remove("active");
                interactionControls.disableQueryMode();
            }
            measureMode = true;
            dom.measure.classList.add("active");
            interactionControls.enableMeasureMode();
        }
    }

    function toggleQuery() {
        if (queryMode) {
            // Disable query mode
            queryMode = false;
            dom.query.classList.remove("active");
            interactionControls.disableQueryMode();
        } else {
            // Disable measure mode if active, then enable query
            if (measureMode) {
                measureMode = false;
                dom.measure.classList.remove("active");
                interactionControls.disableMeasureMode();
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
            if (event.key === "M" || (event.key === "Escape" && measureMode)) {
                toggleMeasure();
            }
        }

        dom.measure.addEventListener("click", handleMeasureClick);
        globalThis.addEventListener("keydown", handleMeasureKeydown);
    }

    if (dom.query) {
        function handleQueryClick() {
            toggleQuery();
        }

        function handleQueryKeydown(event) {
            if (event.key === "F" || (event.key === "Escape" && queryMode)) {
                toggleQuery();
            }
        }

        dom.query.addEventListener("click", handleQueryClick);
        globalThis.addEventListener("keydown", handleQueryKeydown);
    }
}

