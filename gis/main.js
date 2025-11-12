import OSM from "ol/source/OSM";
import { transformExtent } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import { Map, View } from "ol";
import { bbox as bboxStrategy } from "ol/loadingstrategy.js";
import GeoJSON from "ol/format/GeoJSON.js";
import DragBox from "ol/interaction/DragBox.js";
import { getWidth } from "ol/extent.js";
import { defaults as defaultControls } from "ol/control/defaults.js";
import { fromLonLat } from "ol/proj";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import Style from "ol/style/Style.js";
import VectorSource from "ol/source/Vector.js";
import VectorLayer from "ol/layer/Vector";
import { platformModifierKeyOnly } from "ol/events/condition.js";
import Select from "ol/interaction/Select.js";
import ScaleLine from "ol/control/ScaleLine.js";
import WMSCapabilities from "ol/format/WMSCapabilities.js";
import Circle from "ol/style/Circle.js";

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

function scaleControl() {
  const control = new ScaleLine({
    bar: true,
    steps: 4,
    text: true,
    minWidth: 140,
  });

  return control;
}

function installMapControls(map) {
  const menuBtn = document.getElementById("menu");
  const aside = document.querySelector("aside");
  const escala = document.querySelector(".ol-scale-bar");

  if (!menuBtn) {
    console.error("menu id not found");
    return;
  }
  if (!aside) {
    console.error("aside not found");
    return;
  }
  if (!escala) {
    console.error("ol-scale-bar not found");
    return;
  }

  menuBtn.addEventListener("click", () => {
    aside.classList.toggle("menu-open");
    if (escala.style.left == "0.5rem") {
      escala.style.left = "350px";
    } else {
      escala.style.left = "0.5rem";
    }
  });

  document.getElementById("center-arg").onclick = function () {
    const view = map.getView();
    view.animate({
      center: CORRIENTES_TIENE_PAYE,
      zoom: 12,
      duration: 1000,
    });
  };

  document.getElementById("zoom-out").onclick = function () {
    const view = map.getView();
    const zoom = view.getZoom();

    view.animate({
      zoom: zoom - 1,
      duration: 500,
    });
  };

  document.getElementById("zoom-in").onclick = function () {
    const view = map.getView();
    const zoom = view.getZoom();
    view.animate({
      zoom: zoom + 1,
      duration: 500,
    });
  };
}

function installInteractions(map, layersWFS) {
  const selectedStyle = new Style({
    fill: new Fill({
      color: "rgba(255, 165, 0, 0.25)",
    }),
    stroke: new Stroke({
      color: "rgba(255, 115, 0, 1)",
      width: 2,
    }),
  });

  const selectedPointStyle = new Style({
    image: new Circle({
      radius: 8,
      fill: new Fill({ color: "rgba(255,165,0,0.9)" }),
      stroke: new Stroke({ color: "rgba(255,115,0,1)", width: 2 }),
    }),
  });

  const select = new Select({
    style: function (feature) {
      const geom = feature && feature.getGeometry && feature.getGeometry();
      const type = geom && geom.getType && geom.getType();
      if (type === "Point" || type === "MultiPoint") return selectedPointStyle;
      return selectedStyle;
    },
  });

  const dragBox = new DragBox({
    condition: platformModifierKeyOnly,
  });

  let queryMode = false;
  const queryBtn = document.getElementById("query");

  queryBtn.addEventListener("click", () => {
    queryMode = !queryMode;
    queryBtn.classList.toggle("active");

    // Remover interacciones existentes
    map.removeInteraction(select);
    map.removeInteraction(dragBox);

    if (queryMode) {
      // Modo consulta
      map.addInteraction(select);
      map.addInteraction(dragBox);
    } else {
      map.removeInteraction(select);
      map.removeInteraction(dragBox);
    }
  });

  // select.on("select", function () {
  //   const features = select.getFeatures().getArray();
  //   for (const feature of features) {
  //     const props = feature.getProperties();
  //     console.log(props);
  //   }
  // });

  dragBox.on("boxend", function () {
    if (!queryMode) return;

    const boxExtent = dragBox.getGeometry().getExtent();

    const worldExtent = map.getView().getProjection().getExtent();
    const worldWidth = getWidth(worldExtent);
    const startWorld = Math.floor((boxExtent[0] - worldExtent[0]) / worldWidth);
    const endWorld = Math.floor((boxExtent[2] - worldExtent[0]) / worldWidth);

    const rotation = map.getView().getRotation();
    const oblique = rotation % (Math.PI / 2) !== 0;

    select.clearSelection();

    const selected = [];

    for (let world = startWorld; world <= endWorld; ++world) {
      const left = Math.max(boxExtent[0] - world * worldWidth, worldExtent[0]);
      const right = Math.min(boxExtent[2] - world * worldWidth, worldExtent[2]);
      const extent = [left, boxExtent[1], right, boxExtent[3]];

      layersWFS
        .filter((l) => l.getVisible())
        .forEach((layer) => {
          const source = layer.getSource();
          const layerFeatures = source
            .getFeaturesInExtent(extent)
            .filter((f) => f.getGeometry().intersectsExtent(extent));

          if (oblique) {
            const anchor = [0, 0];
            const geometry = dragBox.getGeometry().clone();
            geometry.translate(-world * worldWidth, 0);
            geometry.rotate(-rotation, anchor);
            const boxGeomExtent = geometry.getExtent();

            layerFeatures.forEach((feature) => {
              const geom = feature.getGeometry().clone();
              geom.rotate(-rotation, anchor);
              if (geom.intersectsExtent(boxGeomExtent)) {
                select.selectFeature(feature);
                selected.push({
                  layer: layer.get("layerName"),
                  id: feature.getId(),
                  props: feature.getProperties(),
                });
              }
            });
          } else {
            layerFeatures.forEach((feature) => {
              select.selectFeature(feature);
              selected.push({
                layer: layer.get("title") || layer.get("name"),
                id: feature.getId(),
                props: feature.getProperties(),
              });
            });
          }
        });
    }

    const layersList = document.getElementById("selected-layers");
    const selectedLayers = {};

    if (selected.length > 0) {
      console.group(`Selected ${selected.length} features`);

      selected.forEach((f, i) => {
        const fclass = f.props.fclass;

        if (!(fclass in selectedLayers)) {
          selectedLayers[fclass] = [];
        }

        selectedLayers[fclass].push(f.props);
        console.log(`Feature #${i + 1} [${f.layer}]`, f.props.fclass);
      });

      layersList
        .querySelectorAll("li:not(#map-tab)")
        .forEach((li) => li.remove());

      const resultado = Object.entries(selectedLayers);

      console.log("Resultados seleccionados:", resultado);

      resultado.forEach(([fclass, props]) => {
        const li = document.createElement("li");
        li.textContent = fclass;
        layersList.appendChild(li);
      });

      console.groupEnd();
    } else {
      console.info("No features selected.");
    }
  });

  dragBox.on("boxstart", function () {
    select.clearSelection();
  });
}

async function fetchLayersFromGeoServer(workspace) {
  const url = `http://localhost:8080/geoserver/${workspace}/wms?service=WMS&request=GetCapabilities`;
  const text = await fetch(url).then((r) => r.text());
  const parser = new WMSCapabilities();
  const result = parser.read(text);

  const all = result.Capability.Layer.Layer;

  return all.map((l) => {
    const type = l.Style[0].Name;
    const raw = l.Name.replace(`${workspace}:`, "");
    const format = raw.replace(/_/g, " ").toLowerCase();

    return [raw, format, type];
  });
}

function createWFSLayer(layerName) {
  const color = layerColors[layerIndex % layerColors.length];
  layerIndex++;

  const pointStyle = new Style({
    image: new Circle({
      radius: 6,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#222", width: 1 }),
    }),
  });

  const polygonLineStyle = new Style({
    fill: new Fill({ color }),
    stroke: new Stroke({ color: "#222", width: 1 }),
  });

  const layer = new VectorLayer({
    source: new VectorSource({
      // url: `http://localhost:8080/geoserver/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:${layerName}&outputFormat=application/json&srsname=EPSG:4326`,
      format: new GeoJSON(),
      url: (extent) => {
        const fixed_extent = transformExtent(
          extent,
          "EPSG:3857",
          `EPSG:${EPSG_ID}`
        );
        return (
          `http://localhost:8080/geoserver/${workspace}/ows?service=WFS&` +
          `version=1.1.0&request=GetFeature&typeName=${workspace}:${layerName}&` +
          `outputFormat=application/json&` +
          `srsname=EPSG:${EPSG_ID}&bbox=${fixed_extent.join(
            ","
          )},EPSG:${EPSG_ID}`
        );
      },
      strategy: bboxStrategy,
    }),
    visible: false,
    style: function (feature) {
      const geom = feature.getGeometry && feature.getGeometry();
      const type = geom && geom.getType && geom.getType();
      if (type === "Point" || type === "MultiPoint") return pointStyle;
      return polygonLineStyle;
    },
  });
  layer.set("layerName", layerName);

  return layer;
}

async function init_map(map) {
  const layers = await fetchLayersFromGeoServer(workspace);
  const layersWFS = layers.map(([layerName]) => createWFSLayer(layerName));

  // console.log(layers)

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

const layersWFS = await init_map(map);
installMapControls(map);
installInteractions(map, layersWFS);
