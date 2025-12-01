import { centerInitialPos, zoomIn, zoomOut } from "../map/defaultControls";
import { moveScale } from "../utils/manageScalePos";
import { createMeasureTool } from "../map/interactions/measureTool";
import { createQueryTool } from "../map/interactions/queryTool.JS";
import { createExportTool } from "../map/interactions/exportTool";
import { createDrawTool } from "../map/interactions/drawTool";
import { getFeatureTypeInfo } from "../api/geoserver";
import { workspace } from "../config/mapConst";

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
    // draw: document.querySelector("#draw"),
    measurePolygon: document.querySelector("#measure-polygon"),
    measureLine: document.querySelector("#measure-line"),
    export_pdf: document.querySelector("#export-pdf"),
    layersList: document.getElementById("selected-layers"),
  };

  const measureTool = createMeasureTool(map);
  const queryTool = createQueryTool(map, wfsLayers);
  const exportTool = createExportTool(map, wfsLayers, layersData);
  const drawTool = createDrawTool(map);

  // Configurar el callback de cancelación para el botón Esc del panel de edición
  drawTool.setCancelCallback(() => {
    if (activeToolName === Tools.DRAW) {
      deactivateCurrentTool();
    }
  });

  let activeToolName = null;
  let activeLayerName = null;

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
      disable: (clear) => measureTool.disable(clear),
    },
    [Tools.MEASURE_POLYGON]: {
      domElement: dom.measurePolygon,
      toolInstance: measureTool,
      enable: () => measureTool.activate(Mode.Polygon),
      disable: (clear) => measureTool.disable(clear),
    },
    [Tools.DRAW]: {
      domElement: null,
      toolInstance: drawTool,

      enable: async (layerName) => {
        try {
          const featureInfo = await getFeatureTypeInfo(workspace, layerName);

          drawTool.activate(featureInfo);

          console.log(`Editando capa: ${layerName}`);
        } catch (error) {
          console.error("Error al obtener info de la capa:", error);
        }
      },
      disable: () => drawTool.disable(),
    },
  };

  function setActiveTool(newToolName, params = {}) {
    const newTool = toolsConfig[newToolName];

    const currentTool = activeToolName ? toolsConfig[activeToolName] : null;

    if (activeToolName === newToolName) {
      if (newToolName === Tools.DRAW && activeLayerName !== params.layerName) {
      } else {
        deactivateCurrentTool();
        return;
      }
    }

    if (activeToolName) {
      const isMeasureSwitch =
        (activeToolName === Tools.MEASURE_LINE &&
          newToolName === Tools.MEASURE_POLYGON) ||
        (activeToolName === Tools.MEASURE_POLYGON &&
          newToolName === Tools.MEASURE_LINE);

      const isDrawSwitch =
        activeToolName === Tools.DRAW && newToolName === Tools.DRAW;

      let disableParam = true;

      if (
        activeToolName === Tools.MEASURE_LINE ||
        activeToolName === Tools.MEASURE_POLYGON
      ) {
        disableParam = !isMeasureSwitch;
      } else if (activeToolName === Tools.DRAW) {
        disableParam = isDrawSwitch;
      }

      deactivateCurrentTool(disableParam);
    }

    if (newTool) {
      if (newTool.domElement) {
        newTool.domElement.classList.add("active");
      }

      newTool.enable(params.layerName);

      activeToolName = newToolName;
    }
  }

  function deactivateCurrentTool(param = true) {
    if (!activeToolName) return;

    const tool = toolsConfig[activeToolName];

    if (tool.domElement) tool.domElement.classList.remove("active");

    tool.disable(param);

    activeToolName = null;
    if (activeToolName !== Tools.DRAW) activeLayerName = null;
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

  document.addEventListener("click", (event) => {
    const editBtn = event.target.closest(".edit-button");

    if (editBtn) {
      const layerName = editBtn.dataset.layerName;

      if (layerName) {
        setActiveTool(Tools.DRAW, { layerName: layerName });
      }
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

      case "escape":
        if (activeToolName) setActiveTool(activeToolName);
        break;

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
            drawTool.clearAll();
          } else {
            drawTool.clearSaved();
          }
        }
        break;

      case "z":
        if (activeToolName === Tools.DRAW) {
          event.preventDefault();
          const result = drawTool.undo();
          if (!result.success && result.message) {
            console.warn(result.message);
          }
        }
        break;

      case "b": // Borrar features seleccionadas (DELETE)
        if (activeToolName === Tools.QUERY) {
          event.preventDefault();
          queryTool.deleteSelected();
        }
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
      const isCheckbox =
        activeElement.tagName === "INPUT" && activeElement.type === "checkbox";

      if (isButton || isCheckbox) {
        activeElement.blur();
      }
    }
  });
}
