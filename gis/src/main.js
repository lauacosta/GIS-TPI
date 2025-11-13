import OSM from "ol/source/OSM";
import { transformExtent } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import { Map, View } from "ol";
import { bbox as bboxStrategy } from "ol/loadingstrategy.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { fromLonLat } from "ol/proj";

import VectorSource from "ol/source/Vector.js";
import VectorLayer from "ol/layer/Vector";

import { setupInteractions } from "./map/interactions";

import { getWFSUrl, fetchLayersFromGeoServer } from "./api/geoserver";

import { createLayerStyle } from "./map/styles";
import {
  centerInitialPos,
  scaleControl,
  zoomIn,
  zoomOut,
} from "./map/controls";
import { initSidebar } from "./ui/siderbar";

const workspace = "TPI_GIS";
const EPSG_ID = 4326;
const CORRIENTES_TIENE_PAYE = fromLonLat([-58.82, -27.493]);

const layerColors = [
  "#ff6666",
  "#66ccff",
  "#66ff99",
  "#ffcc66",
  "#cc99ff",
  "#ff99cc",
  "#99ffcc",
  "#cccc66",
];
let layerIndex = 0;

function installMapControls(map) {
  const dom = {
    center: document.getElementById("centerInitialPos"),
    zoomout: document.getElementById("zoom-out"),
    zoomin: document.getElementById("zoom-in"),
  };

  dom.center.onclick = () =>
    centerInitialPos(map.getView(), CORRIENTES_TIENE_PAYE);

  dom.zoomout.onclick = () => zoomOut(map.getView());

  dom.zoomin.onclick = () => zoomIn(map.getView());
}

function createWFSLayer(layerName) {
  const color = layerColors[layerIndex % layerColors.length];
  layerIndex++;

  const styles = createLayerStyle(color);

  const layer = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
      url: (extent) => {
        const fixed_extent = transformExtent(
          extent,
          "EPSG:3857",
          `EPSG:${EPSG_ID}`
        );
        return getWFSUrl(workspace, layerName, fixed_extent, EPSG_ID);
      },
      strategy: bboxStrategy,
    }),
    visible: false,
    style: function (feature) {
      const type = feature.getGeometry().getType();

      if (type === "Point" || type === "MultiPoint") {
        return styles.point;
      }
      return styles.polygon;
    },
  });
  layer.set("layerName", layerName);

  return layer;
}

async function init_map(map) {
  const layers = await fetchLayersFromGeoServer(workspace);
  const layersWFS = layers.map(([layerName]) => createWFSLayer(layerName));

  const ulLayers = document.querySelector(".layers");
  const searchInput = document.getElementById("layer-search");
  const cleanBtn = document.querySelector(".clean-selection");

  cleanBtn.addEventListener("click", () => {
    ulLayers
      .querySelectorAll("input[type='checkbox']")
      .forEach((checkbox, i) => {
        checkbox.checked = false;
        layersWFS[i].setVisible(false);
      });

    cleanBtn.style.display = "none";
  });

  if (!ulLayers || !searchInput) {
    console.warn("Missing .layers UL or #layer-search input");
    return;
  }

  function renderList(list) {
    ulLayers.innerHTML = "";

    list.forEach(([layerName, label, type]) => {
      const emoji =
        {
          point: "📍",
          polygon: "⬟",
          line: "➖",
        }[type] ?? "❓";

      ulLayers.insertAdjacentHTML(
        "beforeend",
        `<li><input type="checkbox" id="${layerName}"><label for="${layerName}"><span class="layer-symbol">${emoji}</span> ${label}</label></li>`
      );

      const checkbox = document.getElementById(layerName);
      const layerIndex = layers.findIndex(([n]) => n === layerName);

      if (!checkbox) return;

      checkbox.checked = layersWFS[layerIndex].getVisible();
      checkbox.addEventListener("change", () => {
        layersWFS[layerIndex].setVisible(checkbox.checked);

        const anyChecked = [
          ...ulLayers.querySelectorAll("input[type='checkbox']"),
        ].some((input) => input.checked);
        cleanBtn.style.display = anyChecked ? "inline-block" : "none";
      });
    });
  }
  renderList(layers);

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    renderList(
      layers.filter(
        ([name, label]) =>
          name.toLowerCase().includes(q) || label.toLowerCase().includes(q)
      )
    );
  });

  const capaBaseOSM = new TileLayer({
    source: new OSM(),
  });

  map.setLayers([capaBaseOSM, ...layersWFS]);

  return layersWFS;
}

const map = new Map({
  controls: defaultControls().extend([scaleControl()]),
  target: "map",
  view: new View({
    // projection: `EPSG:${EPSG_ID}`,
    center: CORRIENTES_TIENE_PAYE,
    zoom: 12,
  }),
});

initSidebar();
const layersWFS = await init_map(map);
installMapControls(map);

const mapControls = setupInteractions(map, layersWFS);

const queryBtn = document.getElementById("query");
let queryMode = false;

queryBtn.addEventListener("click", () => {
  queryMode = !queryMode;
  queryBtn.classList.toggle("active");

  if (queryMode) {
    mapControls.enableQueryMode();
  } else {
    mapControls.disableQueryMode();
  }
});
