import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";

export function initToolbar(map, interactionControls) {
    const dom = {
        center: document.getElementById("centerInitialPos"),
        zoomout: document.getElementById("zoom-out"),
        zoomin: document.getElementById("zoom-in"),
        query: document.getElementById("query"),
        draw: document.getElementById("draw"),
        measure: document.getElementById("measure"),
    };

    dom.center.addEventListener("click", () => {
        centerInitialPos(map.getView());
    });

    dom.zoomout.addEventListener("click", () => {
        zoomOut(map.getView());
    });

    dom.zoomin.addEventListener("click", () => {
        zoomIn(map.getView());
    });

    dom.draw.addEventListener("click", () => {
        alert("CHAQUE. Aún no esta implementado. Anda a UI/toolbar");
    });

    if (dom.measure) {
        let measureMode = false;

        const toggle_measure = () => {
            measureMode = !measureMode
            dom.measure.classList.toggle("active");

            if (measureMode) {
                interactionControls.enableMeasureMode();
            } else {
                interactionControls.enableMeasureMode();
            }
        }

        dom.measure.addEventListener("click", toggle_measure);
        window.addEventListener("keydown", (e) => {
            if (e.key === "M" || (e.key === "Escape" && measureMode)) {
                toggle_measure();
            }
        });

    }

    if (dom.query) {
        let queryMode = false;

        const toggle_query = () => {
            queryMode = !queryMode;

            dom.query.classList.toggle("active");

            if (queryMode) {
                interactionControls.enableQueryMode();
            } else {
                interactionControls.disableQueryMode();
            }
        };

        dom.query.addEventListener("click", toggle_query);
        // (Lautaro) Como hasta ahora no tenemos otros shortcuts, lo dejo aca;
        window.addEventListener("keydown", (e) => {
            if (e.key === "F" || (e.key === "Escape" && queryMode)) {
                toggle_query();
            }
        });
    }
}

