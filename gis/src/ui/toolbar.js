"use strict";
import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";
import { moveScale } from "../utils/manageScalePos";
import { createMeasureTool } from "../map/interactions/measureTool";
import { createQueryTool } from "../map/interactions/queryTool.JS";
import { createExportTool } from "../map/interactions/exportTool";

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

export function initToolbar(map, wfsLayers, layersData) {
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

  const measureTool = createMeasureTool(map);
  const queryTool = createQueryTool(map, wfsLayers);

  const exportTool = createExportTool(map, wfsLayers, layersData);

  let measureMode = false;
  let queryMode = false;

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
      queryTool.disable();
    } else {
      if (measureMode) {
        measureMode = false;

        matchMode(currentMeasureType, {
          LineString: () => dom.measureLine.classList.remove("active"),
          Polygon: () => dom.measurePolygon.classList.remove("active"),
        });
        measureTool.disable();
      }
      queryMode = true;
      dom.query.classList.add("active");
      queryTool.enable();
    }
  }

  function toggleMeasureModes(mode) {
    if (measureMode) {
      if (mode === currentMeasureType) {
        measureMode = false;
        matchMode(currentMeasureType, {
          LineString: () => dom.measureLine.classList.remove("active"),
          Polygon: () => dom.measurePolygon.classList.remove("active"),
        });
        currentMeasureType = mode;
        measureTool.disable();
        return;
      }

      matchMode(currentMeasureType, {
        LineString: () => dom.measureLine.classList.remove("active"),
        Polygon: () => dom.measurePolygon.classList.remove("active"),
      });

      matchMode(mode, {
        LineString: () => dom.measureLine.classList.add("active"),
        Polygon: () => dom.measurePolygon.classList.add("active"),
      });
      currentMeasureType = mode;

      measureTool.activate(mode);
    } else {
      if (queryMode) {
        queryMode = false;
        dom.query.classList.remove("active");
        queryTool.disable();
      }
      measureMode = true;
      currentMeasureType = mode;

      matchMode(mode, {
        LineString: () => dom.measureLine.classList.add("active"),
        Polygon: () => dom.measurePolygon.classList.add("active"),
      });
      measureTool.activate(mode);
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
      measureTool.finish();
    }
  }

  if (dom.measureLine) {
    dom.measureLine.addEventListener("click", () =>
      toggleMeasureModes(Mode.LineString)
    );
    globalThis.addEventListener("keydown", handleMeasureKeydown);
  }

  if (dom.measurePolygon) {
    dom.measurePolygon.addEventListener("click", () =>
      toggleMeasureModes(Mode.Polygon)
    );
  }

  if (dom.query) {
    dom.query.addEventListener("click", toggleQuery);

    globalThis.addEventListener("keydown", (event) => {
      if (event.key === "f" || (event.key === "Escape" && queryMode)) {
        toggleQuery();
      }
    });
  }

  if (dom.export_pdf) {
    dom.export_pdf.addEventListener("click", () => {
      exportTool.export("a4");
    });
  }

  moveScale(true);
}
