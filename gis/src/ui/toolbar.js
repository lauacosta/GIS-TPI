import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";
import { moveScale } from "../utils/manageScalePos";
import { createMeasureTool } from "../map/interactions/measureTool";
import { createQueryTool } from "../map/interactions/queryTool.JS";
import { createExportTool } from "../map/interactions/exportTool";
import { createDrawTool } from "../map/interactions/drawTool";
import { getFeatureTypeInfo } from "../api/geoserver";
import { workspace } from "../config/mapConst";
import { selectedLayer } from "./layerList";
import { Point } from "ol/geom";

const Tools = {
  QUERY: "query",
  MEASURE_LINE: "measureLine",
  MEASURE_POLYGON: "measurePolygon",
  DRAW: "draw",
};

const Mode = Object.freeze({
  Point: "Point",
  LineString: "LineString",
  Polygon: "Polygon",
});

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
  const drawTool = createDrawTool(map);

  let activeToolName = null;

  const toolsConfig = {
    [Tools.QUERY]: {
      domElement: dom.query,
      toolInstance: queryTool,
      enable: () => queryTool.enable(),
      disable: () => queryTool.disable(),
    },
    [Tools.MEASURE_LINE]: {
      domElement: dom.measureLine,
      toolInstance: measureTool,
      enable: () => measureTool.activate(Mode.LineString),
      disable: () => measureTool.disable(),
    },
    [Tools.MEASURE_POLYGON]: {
      domElement: dom.measurePolygon,
      toolInstance: measureTool,
      enable: () => measureTool.activate(Mode.Polygon),
      disable: () => measureTool.disable(),
    },
    [Tools.DRAW]: {
      domElement: dom.draw,
      toolInstance: "drawToolPlaceholder",
      enable: () => {
        const selectedStyle = getFeatureTypeInfo(workspace, selectedLayer.name);
        drawTool.activate(selectedStyle)},
      disable: () => drawTool.disable(),
    },
  };

  function setActiveTool(newToolName) {
    const newTool = toolsConfig[newToolName];
    const currentTool = activeToolName ? toolsConfig[activeToolName] : null;

    if (activeToolName === newToolName) {
      deactivateCurrentTool();
      return;
    }

    if (currentTool && newTool.toolInstance === currentTool.toolInstance) {
      currentTool.domElement.classList.remove("active");
      newTool.domElement.classList.add("active");
      newTool.enable();
      activeToolName = newToolName;
      return;
    }

    if (activeToolName) {
      deactivateCurrentTool();
    }

    if (newTool) {
      if (newTool.domElement) newTool.domElement.classList.add("active");
      newTool.enable();
      activeToolName = newToolName;
    }
  }

  function deactivateCurrentTool() {
    if (!activeToolName) return;
    const tool = toolsConfig[activeToolName];

    if (tool.domElement) tool.domElement.classList.remove("active");
    tool.disable();
    activeToolName = null;
  }
  function deactivateCurrentTool() {
    if (!activeToolName) return;

    const tool = toolsConfig[activeToolName];

    if (tool.domElement) tool.domElement.classList.remove("active");

    tool.disable();

    activeToolName = null;
  }

  dom.center.addEventListener("click", () => centerInitialPos(map.getView()));
  dom.zoomout.addEventListener("click", () => zoomOut(map.getView()));
  dom.zoomin.addEventListener("click", () => zoomIn(map.getView()));

  if (dom.export_pdf) {
    dom.export_pdf.addEventListener("click", () => exportTool.export("a4"));
  }

  Object.keys(toolsConfig).forEach((key) => {
    const cfg = toolsConfig[key];
    if (cfg.domElement) {
      cfg.domElement.addEventListener("click", () => setActiveTool(key));
    }
  });

  globalThis.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT") return;

    const key = event.key.toLowerCase();

    switch (key) {
      case "x":
        centerInitialPos(map.getView());

        dom.center.classList.add("active");
        setTimeout(() => dom.center.classList.remove("active"), 1000);
        break;

      case "f":
        setActiveTool(Tools.QUERY);
        break;
      case "l":
        setActiveTool(Tools.MEASURE_LINE);
        break;
      case "p":
        setActiveTool(Tools.MEASURE_POLYGON);
        break;
      case "d":
        setActiveTool(Tools.DRAW);
        break;

      case "escape":
        if (activeToolName) setActiveTool(activeToolName);
        break;

      case "enter":
        if (
          activeToolName === Tools.MEASURE_LINE ||
          activeToolName === Tools.MEASURE_POLYGON
        ) {
          event.preventDefault();
          measureTool.finish();
        }
        break;
    }
  });

  // Nuevos atajos de teclado para drawTool
  document.addEventListener("keydown", (event) => {
    // Evitar conflictos si estás escribiendo en un input
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
      return;
    }

    switch (event.key.toLowerCase()) {
      // ...existing cases...
      
      case "s": // Guardar todos los dibujos
        if (activeToolName === Tools.DRAW) {
          event.preventDefault();
          drawTool.saveAll();
        }
        break;
        
      case "c": // Limpiar dibujos guardados
        if (activeToolName === Tools.DRAW) {
          event.preventDefault();
          const pending = drawTool.getPendingCount();
          if (pending > 0) {
            const confirm = window.confirm(
              `Tienes ${pending} dibujo(s) sin guardar. ¿Limpiar de todos modos?`
            );
            if (confirm) {
              drawTool.clearAll();
            }
          } else {
            drawTool.clearSaved();
          }
        }
        break;
    }
  });

  console.log("Toolbar inicializado");
  console.log("Atajos: Q=query, M=measure-polygon, L=measure-line, D=draw, S=save drawings, C=clear drawings");


  moveScale(true);
}
