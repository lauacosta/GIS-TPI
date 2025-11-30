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
      disable: () => measureTool.disable(),
    },
    [Tools.MEASURE_POLYGON]: {
      domElement: dom.measurePolygon,
      toolInstance: measureTool,
      enable: () => measureTool.activate(Mode.Polygon),
      disable: () => measureTool.disable(),
    },
    [Tools.DRAW]: {
      domElement: null, // null evita que se agregue la clase "active"
      toolInstance: drawTool,

      enable: async (layerName) => {
        try {
          // 2. Agregamos 'await' para esperar la respuesta de GeoServer
          const featureInfo = await getFeatureTypeInfo(workspace, layerName);

          // Ahora 'featureInfo' es el objeto real, no una promesa
          console.log("Info recibida:", featureInfo);

          // 3. Pasamos el dato resuelto a la herramienta
          // OJO: Asegúrate de que drawTool.activate sepa leer este objeto
          // o pásale solo el tipo de geometría (ej: featureInfo.geometryType)
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
    // const currentTool = activeToolName ? toolsConfig[activeToolName] : null;

    if (activeToolName === newToolName && newToolName === Tools.DRAW) {
      if (activeLayerName === params.layerName) {
        deactivateCurrentTool();
        return;
      }
    } else if (activeToolName === newToolName) {
      deactivateCurrentTool();
      return;
    }

    if (activeToolName) {
      deactivateCurrentTool();
    }

    if (newTool) {
      if (newTool.domElement) {
        newTool.domElement.classList.add("active");
      }

      newTool.enable(params.layerName);

      activeToolName = newToolName;
      if (params.layerName) activeLayerName = params.layerName;
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

      case "d":
        setActiveTool(Tools.DRAW);
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

  console.log("Toolbar inicializado");
  console.log(
    "Atajos: Q=query, M=measure-polygon, L=measure-line, S=save drawings, C=clear drawings"
  );

  moveScale(true);
}
