import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { Map, View } from "ol";
import { fromLonLat } from "ol/proj";
import { TileWMS } from "ol/source";

const workspace = "TPI_GIS";

const layers = [
  ["actividades_agropecuarias", "Actividades agropecuarias"],
  ["actividades_economicas", "Actividades económicas"],
  ["complejo_de_energia_ene", "Complejo de energía"],
  ["curso_de_agua_hid", "Curso de agua"],
  ["curvas_de_nivel", "Curvas de nivel"],
  ["edif_construcciones_turisticas", "Edif. y construcciones turísticas"],
  ["edif_depor_y_esparcimiento", "Edif. de deporte y esparcimiento"],
  ["edif_educacion", "Edif. de educación"],
  ["edif_religiosos", "Edif. religiosas"],
  ["edificio_de_salud_ips", "Edificio de salud (IPS)"],
  ["edificio_de_seguridad_ips", "Edificio de seguridad (IPS)"],
  ["edificio_publico_ips", "Edificio público (IPS)"],
  ["edificios_ferroviarios", "Edificios ferroviarios"],
  ["ejido", "Ejido"],
  ["espejo_de_agua_hid", "Espejo de agua"],
  ["estructuras_portuarias", "Estructuras portuarias"],
  ["infraestructura_aeroportuaria_punto", "Infraestructura aeroportuaria"],
  ["infraestructura_hidro", "Infraestructura hidrográfica"],
  ["isla", "Isla"],
  ["limite_politico_administrativo_lim", "Límite político-administrativo"],
  ["localidades", "Localidades"],
  ["líneas_de_conducción_ene", "Líneas de conducción eléctrica"],
  ["marcas_y_señales", "Marcas y señales"],
  ["muro_embalse", "Muro de embalse"],
  ["obra_de_comunicación", "Obra de comunicación"],
  ["obra_portuaria", "Obra portuaria"],
  ["otras_edificaciones", "Otras edificaciones"],
  ["pais_lim", "País limítrofe"],
  ["provincias", "Provincias"],
  ["puente_red_vial_puntos", "Puente de red vial (puntos)"],
  ["puntos_de_alturas_topograficas", "Puntos de alturas topográficas"],
  ["puntos_del_terreno", "Puntos del terreno"],
  ["red_ferroviaria", "Red ferroviaria"],
  ["red_vial", "Red vial"],
  ["salvado_de_obstaculo", "Salvado de obstáculo"],
  ["señalizaciones", "Señalizaciones"],
  ["sue_congelado", "Suelo congelado"],
  ["sue_consolidado", "Suelo consolidado"],
  ["sue_costero", "Suelo costero"],
  ["sue_hidromorfologico", "Suelo hidromorfológico"],
  ["veg_arborea", "Vegetación arbórea"],
  ["veg_arbustiva", "Vegetación arbustiva"],
  ["veg_cultivos", "Vegetación de cultivos"],
  ["veg_hidrofila", "Vegetación hidrófila"],
  ["veg_suelo_desnudo", "Vegetación de suelo desnudo"],
  ["vias_secundarias", "Vías secundarias"],
];

function createWMSLayer(layerName) {
  return new TileLayer({
    source: new TileWMS({
      url: "http://localhost:8080/geoserver/wms",
      params: {
        LAYERS: `${workspace}:${layerName}`,
        TILED: true,
      },
      serverType: "geoserver",
    }),
    visible: false,
  });
}

const layersWMS = layers.map((layerInfo) => createWMSLayer(layerInfo[0]));

const capaBaseOSM = new TileLayer({
  source: new OSM(),
});

const map = new Map({
  target: "map",
  layers: [capaBaseOSM, ...layersWMS],
  view: new View({
    center: fromLonLat([-63.6, -38.4]),
    zoom: 5,
  }),
});

const menuBtn = document.getElementById("menu");
const aside = document.querySelector("aside");

menuBtn.addEventListener("click", () => {
  aside.classList.toggle("menu-open");
});

document.getElementById("center-arg").onclick = function () {
  const view = map.getView();
  view.setCenter(fromLonLat([-63.6, -38.4]));
  view.setZoom(5);
};

document.getElementById("zoom-out").onclick = function () {
  const view = map.getView();
  const zoom = view.getZoom();
  view.setZoom(zoom - 1);
};

document.getElementById("zoom-in").onclick = function () {
  const view = map.getView();
  const zoom = view.getZoom();
  view.setZoom(zoom + 1);
};

const ulLayers = document.querySelector(".layers");

// Source - https://stackoverflow.com/questions/814564/inserting-html-elements-with-javascript

layers.map((layer) => {
  ulLayers.insertAdjacentHTML("afterbegin", `<li>${layer[1]}</li>`);
});
