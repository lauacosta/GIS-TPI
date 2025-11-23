"use strict"
import { jsPDF } from 'jspdf';
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

const dims = {
    a0: [1189, 841],
    a1: [841, 594],
    a2: [594, 420],
    a3: [420, 297],
    a4: [297, 210],
    a5: [210, 148],
};

export function initToolbar(map, interactionControls) {
    const dom = {
        center: document.querySelector("#centerInitialPos"),
        zoomout: document.querySelector("#zoom-out"),
        zoomin: document.querySelector("#zoom-in"),
        query: document.querySelector("#query"),
        draw: document.querySelector("#draw"),
        measurePolygon: document.querySelector("#measure-polygon"),
        measureLine: document.querySelector("#measure-line"),
        export_pdf: document.querySelector("#export-pdf"),
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
                matchMode(currentMeasureType, {
                    LineString: () => {
                        dom.measureLine.classList.remove("active");
                    },
                    Polygon: () => {
                        dom.measurePolygon.classList.remove("active");
                    }
                })

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


    if (dom.export_pdf) {
        // https://openlayers.org/en/latest/examples/export-pdf.html
        dom.export_pdf.addEventListener(
            'click',
            () => {
                dom.export_pdf.disabled = true;
                document.body.style.cursor = 'progress';
                const stopProgress = startProgress();

                // const format = document.getElementById('format').value;
                const format = "a4"
                // const resolution = Number(document.querySelector('#resolution').value);
                const resolution = 125;
                const dim = dims[format];
                const width = Math.round((dim[0] * resolution) / 25.4);
                const height = Math.round((dim[1] * resolution) / 25.4);
                const size = map.getSize();
                const viewResolution = map.getView().getResolution();

                map.once('rendercomplete', function() {
                    stopProgress();
                    const mapCanvas = document.createElement('canvas');
                    mapCanvas.width = width;
                    mapCanvas.height = height;
                    const mapContext = mapCanvas.getContext('2d');
                    Array.prototype.forEach.call(
                        document.querySelectorAll('.ol-layer canvas'),
                        function(canvas) {
                            if (canvas.width > 0) {
                                const opacity = canvas.parentNode.style.opacity;
                                mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
                                const transform = canvas.style.transform;
                                // Get the transform parameters from the style's transform matrix
                                const matrix = transform
                                    .match(/^matrix\(([^\(]*)\)$/)[1]
                                    .split(',')
                                    .map(Number);
                                // Apply the transform to the export map context
                                CanvasRenderingContext2D.prototype.setTransform.apply(
                                    mapContext,
                                    matrix,
                                );
                                mapContext.drawImage(canvas, 0, 0);
                            }
                        },
                    );
                    mapContext.globalAlpha = 1;
                    mapContext.setTransform(1, 0, 0, 1, 0, 0);
                    const pdf = new jsPDF('landscape', undefined, format);
                    pdf.addImage(
                        mapCanvas.toDataURL('image/jpeg'),
                        'JPEG',
                        0,
                        0,
                        dim[0],
                        dim[1],
                    );
                    pdf.save('map.pdf');
                    // Reset original map size
                    map.setSize(size);
                    map.getView().setResolution(viewResolution);
                    dom.export_pdf.disabled = false;
                    document.body.style.cursor = 'auto';
                });

                // Set print size
                const printSize = [width, height];
                map.setSize(printSize);
                const scaling = Math.min(width / size[0], height / size[1]);
                map.getView().setResolution(viewResolution / scaling);
            },
            false,
        );

    }
}

// WARN: No tiene en cuenta nada para ir incrementando, solo avanza un poco cada 500ms.
function startProgress() {
    const bar = document.querySelector("#pdf-progress");
    bar.classList.remove("hidden");
    bar.style.width = "30%";

    let w = 30;
    const timer = setInterval(() => {
        w = Math.min(95, w + 5);
        bar.style.width = w + "%";
    }, 300);

    return () => {
        clearInterval(timer);
        bar.style.width = "100%";
        setTimeout(() => bar.classList.add("hidden"), 500);
    };
}

