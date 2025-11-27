import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";
import { moveScale } from "../utils/manageScalePos";
import { createMeasureTool } from "../map/interactions/measureTool";
import { createQueryTool } from "../map/interactions/queryTool.JS";
import { createExportTool } from "../map/interactions/exportTool";

const Tools = {
  QUERY: "query",
  MEASURE_LINE: "measureLine",
  MEASURE_POLYGON: "measurePolygon",
  DRAW: "draw",
};

const Mode = Object.freeze({
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
      enable: () => console.log("Draw ON"),
      disable: () => console.log("Draw OFF"),
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

  moveScale(true);

  document.addEventListener("click", (event) => {
    const activeElement = document.activeElement;

    if (activeElement) {
      const isButton = activeElement.tagName === "BUTTON";
      const isCheckboxOrRadio =
        activeElement.tagName === "INPUT" &&
        (activeElement.type === "checkbox" || activeElement.type === "radio");

      if (isButton || isCheckboxOrRadio) {
        activeElement.blur();
      }
    }
  });
}
