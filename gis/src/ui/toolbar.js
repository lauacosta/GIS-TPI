"use strict"
import { jsPDF } from 'jspdf';
import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";
import { createMeasureController } from "../map/interactions";
import Map from 'ol/Map.js';
import View from 'ol/View.js';

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
        // TODO: Revisar el calculo de las dimensiones, no me gusta mucho el resultado.
        dom.export_pdf.addEventListener("click", () => {
            dom.export_pdf.disabled = true;
            document.body.style.cursor = "progress";

            const stopProgress = startProgress();

            const format = "a4";
            const resolution = 125;
            const dim = dims[format];
            const width = Math.round((dim[0] * resolution) / 25.4);
            const height = Math.round((dim[1] * resolution) / 25.4);

            const view = map.getView();
            const originalSize = map.getSize();
            const originalResolution = view.getResolution();

            const scale = resolution / 96;
            console.log(scale)
            const exportResolution = view.getResolution() / scale;

            view.setResolution(exportResolution);
            map.setSize([width, height]);

            map.once("rendercomplete", () => {
                const exportCanvas = document.createElement("canvas");
                exportCanvas.width = width;
                exportCanvas.height = height;
                const ctx = exportCanvas.getContext("2d");

                const layerCanvases = document.querySelectorAll(".ol-layer canvas");

                layerCanvases.forEach(canvas => {
                    if (canvas.width <= 0) return;

                    const opacity = canvas.parentNode.style.opacity;
                    ctx.globalAlpha = opacity === "" ? 1 : Number(opacity);

                    const transform = canvas.style.transform;
                    const matrix = transform
                        .match(/^matrix\(([^\)]*)\)$/)[1]
                        .split(",")
                        .map(Number);

                    ctx.setTransform(...matrix);
                    ctx.drawImage(canvas, 0, 0);
                });

                ctx.globalAlpha = 1;
                ctx.setTransform(1, 0, 0, 1, 0, 0);

                drawScaleBarForPdf(map, ctx, width, height, scale);
                drawNorthArrow(ctx, width, height, scale);

                const pdf = new jsPDF("landscape", undefined, format);
                pdf.addImage(
                    exportCanvas.toDataURL("image/png"),
                    "PNG",
                    0,
                    0,
                    dim[0],
                    dim[1]
                );
                pdf.save("map.pdf");

                view.setResolution(originalResolution);
                map.setSize(originalSize);

                stopProgress();
                dom.export_pdf.disabled = false;
                document.body.style.cursor = "auto";
            });

            map.renderSync();
        });
    }

}

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

function getMetersPerUnit(unit) {
    const table = {
        'm': 1,
        'meter': 1,
        'meters': 1,
        'degrees': 111319.49079327357,
        'ft': 0.3048
    };
    return table[unit] || 1;
}

function niceScaleDistance(d) {
    const base = Math.pow(10, Math.floor(Math.log10(d)));
    for (const step of [1, 2, 5]) {
        const val = step * base;
        if (val >= d) return val;
    }
    return 10 * base;
}
function drawScaleBarForPdf(map, ctx, canvasWidth, canvasHeight, scale) {
    const view = map.getView();
    const proj = view.getProjection();
    const resolution = view.getResolution();
    const metersPerPixel =
        resolution * getMetersPerUnit(proj.getUnits()) / window.devicePixelRatio;

    // --- DPI-aware sizes ---
    const barMaxPx = 180 * scale;     // desired width on PDF
    const barHeight = 10 * scale;     // height per block
    const padding = 35 * scale;       // from canvas edge
    const fontSize = 18 * scale;      // text size

    // --- nice round distance ---
    const rawMeters = metersPerPixel * barMaxPx;
    const niceMeters = niceScaleDistance(rawMeters);
    const totalWidthPx = niceMeters / metersPerPixel;

    // label text
    const label =
        niceMeters >= 1000
            ? `${(niceMeters / 1000).toFixed(0)} km`
            : `${niceMeters} m`;

    // position
    const x0 = padding;
    const y0 = canvasHeight - padding;

    // --- background box ---
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 10 * scale;
    ctx.fillStyle = "white";
    ctx.fillRect(
        x0 - 10 * scale,
        y0 - barHeight - 50 * scale,
        totalWidthPx + 20 * scale,
        barHeight + 65 * scale
    );
    ctx.restore();

    // --- 4 block layout ---
    const segmentWidth = totalWidthPx / 4;

    const colors = ["#000", "#fff", "#000", "#fff"];

    ctx.lineWidth = 1.4 * scale;
    ctx.strokeStyle = "#000";

    // draw blocks
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(
            x0 + i * segmentWidth,
            y0 - barHeight,
            segmentWidth,
            barHeight
        );
        ctx.strokeRect(
            x0 + i * segmentWidth,
            y0 - barHeight,
            segmentWidth,
            barHeight
        );
    }

    // --- ticks ---
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
        const tx = x0 + i * segmentWidth;
        ctx.moveTo(tx, y0 - barHeight - 4 * scale);
        ctx.lineTo(tx, y0 - barHeight + barHeight + 4 * scale);
    }
    ctx.stroke();

    // --- label ---
    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000";
    ctx.fillText(label, x0, y0 - barHeight - 12 * scale);
}

function drawNorthArrow(ctx, canvasWidth, canvasHeight, scale) {
    const size = 40 * scale;
    const padding = 40 * scale;

    const cx = canvasWidth - padding;
    const cy = padding + size;

    // // --- soft shadow halo ---
    // ctx.save();
    // ctx.shadowColor = "rgba(0,0,0,0.25)";
    // ctx.shadowBlur = 12 * scale;

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx - size * 0.45, cy);
    ctx.lineTo(cx + size * 0.45, cy);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.70);
    ctx.lineTo(cx - size * 0.32, cy);
    ctx.lineTo(cx + size * 0.32, cy);
    ctx.closePath();
    ctx.fill();

    ctx.font = `${22 * scale}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#000";
    ctx.fillText("N", cx, cy - size - 6 * scale);
}

