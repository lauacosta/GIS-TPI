import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { Map, View } from "ol";
// import GeoJSON from 'ol/format/GeoJSON.js';
import DragBox from 'ol/interaction/DragBox.js';
import { getWidth } from 'ol/extent.js';
import { fromLonLat } from "ol/proj";
import { TileWMS } from "ol/source";
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
// import VectorSource from 'ol/source/Vector.js';
// import VectorLayer from "ol/layer/Vector";
import { platformModifierKeyOnly } from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';

const workspace = 'TPI_GIS';

const style = new Style({
    fill: new Fill({
        color: '#eeeeee',
    }),
});


// TODO: Conseguir los nombres a partir de postgis o geoserver
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

// ---------- LIB ---------
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

// ---------- CAPAS ---------
const layersWMS = layers.map((layerInfo) => createWMSLayer(layerInfo[0]));

const capaBaseOSM = new TileLayer({
    source: new OSM(),
});

// const vectorSource = new VectorSource({
//     url: `http://localhost:8080/geoserver/TPI_GIS/ows?service=WFS&version=1.0.0&request=GetFeature&typename=TPI_GIS:provincias&outputFormat=application/json&srsname=EPSG:4326`,
//     format: new GeoJSON(),
// });

// const vectorLayer1 = new VectorLayer({
//     source: vectorSource,
//     background: '#1a2b39',
//     style: function(feature) {
//         const color = feature.get('COLOR_BIO') || '#eeeeee';
//         style.getFill().setColor(color);
//         return style;
//     },
// });


// ---------- MAPA ---------
const map = new Map({
    target: "map",
    // layers: [capaBaseOSM, ...layersWMS, vectorLayer1],
    layers: [capaBaseOSM, ...layersWMS],
    view: new View({
        center: fromLonLat([-63.6, -38.4]),
        zoom: 5,
    }),
});

const selectedStyle = new Style({
    fill: new Fill({
        color: 'rgba(255, 255, 255, 0.6)',
    }),
    stroke: new Stroke({
        color: 'rgba(255, 255, 255, 0.7)',
        width: 2,
    }),
});


// ---------- INTERACCIONES ---------
const menuBtn = document.getElementById("menu");
const aside = document.querySelector("aside");

menuBtn.addEventListener("click", () => {
    aside.classList.toggle("menu-open");
});

document.getElementById("center-arg").onclick = function() {
    const view = map.getView();
    const ARGENTINAPAPA = fromLonLat([-63.6, -38.4]);
    view.animate({
        center: ARGENTINAPAPA,
        zoom: 5,
        duration: 1000,
    });
};

document.getElementById("zoom-out").onclick = function() {
    const view = map.getView();
    const zoom = view.getZoom();

    view.animate({
        zoom: zoom - 1,
        duration: 500,
    });
};

document.getElementById("zoom-in").onclick = function() {
    const view = map.getView();
    const zoom = view.getZoom();
    view.animate({
        zoom: zoom + 1,
        duration: 500,
    });
};


const ulLayers = document.querySelector(".layers");

// Source - https://stackoverflow.com/questions/814564/inserting-html-elements-with-javascript

layers.map((layer) => {
    ulLayers.insertAdjacentHTML("afterbegin",
        `
    <li><input type="checkbox" id="${layer[0]}"><label for="${layer[0]}">${layer[1]}</label></li>
    `
    );

    layers.forEach((layer, i) => {
        const id = layer[0];
        const input = document.getElementById(id);
        if (!input) return;

        input.checked = layersWMS[i].getVisible();

        input.addEventListener("change", (e) => {
            layersWMS[i].setVisible(e.target.checked);
        });
    });
});


const select = new Select({
    filter: function(feature) {
        return !(feature.get('COLOR_BIO') === '#CC6767');
    },
    style: function(feature) {
        const color = feature.get('COLOR_BIO') || '#eeeeee';
        selectedStyle.getFill().setColor(color);
        return selectedStyle;
    },
});

map.addInteraction(select);

const dragBox = new DragBox({
    condition: platformModifierKeyOnly,
});

map.addInteraction(dragBox);

dragBox.on('boxend', function() {
    const boxExtent = dragBox.getGeometry().getExtent();

    // if the extent crosses the antimeridian process each world separately
    const worldExtent = map.getView().getProjection().getExtent();
    const worldWidth = getWidth(worldExtent);
    const startWorld = Math.floor((boxExtent[0] - worldExtent[0]) / worldWidth);
    const endWorld = Math.floor((boxExtent[2] - worldExtent[0]) / worldWidth);

    for (let world = startWorld; world <= endWorld; ++world) {
        const left = Math.max(boxExtent[0] - world * worldWidth, worldExtent[0]);
        const right = Math.min(boxExtent[2] - world * worldWidth, worldExtent[2]);
        const extent = [left, boxExtent[1], right, boxExtent[3]];

        const boxFeatures = vectorSource
            .getFeaturesInExtent(extent)
            .filter((feature) => feature.getGeometry().intersectsExtent(extent));

        // features that intersect the box geometry are added to the
        // collection of selected features

        // if the view is not obliquely rotated the box geometry and
        // its extent are equalivalent so intersecting features can
        // be added directly to the collection
        const rotation = map.getView().getRotation();
        const oblique = rotation % (Math.PI / 2) !== 0;

        // when the view is obliquely rotated the box extent will
        // exceed its geometry so both the box and the candidate
        // feature geometries are rotated around a common anchor
        // to confirm that, with the box geometry aligned with its
        // extent, the geometries intersect
        if (oblique) {
            const anchor = [0, 0];
            const geometry = dragBox.getGeometry().clone();
            geometry.translate(-world * worldWidth, 0);
            geometry.rotate(-rotation, anchor);
            const extent = geometry.getExtent();
            boxFeatures.forEach(function(feature) {
                const geometry = feature.getGeometry().clone();
                geometry.rotate(-rotation, anchor);
                if (geometry.intersectsExtent(extent)) {
                    select.selectFeature(feature);
                }
            });
        } else {
            boxFeatures.forEach(select.selectFeature.bind(select));
        }
    }
});

// clear selection when drawing a new box and when clicking on the map
dragBox.on('boxstart', function() {
    select.clearSelection();
});

const tabs = document.getElementById("selection-tabs");
const tabContent = document.getElementById("selection-content");

select.on('select', function() {
    const features = select.getFeatures().getArray();


    renderTabs(features.filter(f => f.get('ECO_NAME')));
});

function renderTabs(features) {
    tabs.innerHTML = "";
    tabContent.innerHTML = "";

    if (features.length === 0) return;

    features.forEach((feature, index) => {
        const name = feature.get("ECO_NAME") || "Sin nombre";

        const tabButton = document.createElement("button");
        tabButton.textContent = name;
        if (index === 0) tabButton.classList.add("active");

        tabButton.addEventListener("click", () => {
            document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
            tabButton.classList.add("active");
            showFeature(feature);
        });

        tabs.appendChild(tabButton);
    });

    showFeature(features[0]);
}

function showFeature(feature) {
    tabContent.innerHTML = `
    <table>
      <tr><th>Campo</th><th>Valor</th></tr>
      ${Object.entries(feature.getProperties())
            .filter(([key]) => key !== 'geometry')
            .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
            .join("")}
    </table>
  `;
}

