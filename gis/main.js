import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { Feature, Map, View } from "ol";
import GeoJSON from 'ol/format/GeoJSON.js';
import DragBox from 'ol/interaction/DragBox.js';
import { getWidth } from 'ol/extent.js';
import { defaults as defaultControls } from "ol/control/defaults.js";
import { fromLonLat } from "ol/proj";
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from "ol/layer/Vector";
import { platformModifierKeyOnly } from 'ol/events/condition.js';
import Select from 'ol/interaction/Select.js';
import ScaleLine from "ol/control/ScaleLine.js";

const workspace = "TPI_GIS";

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

const style = new Style({
    fill: new Fill({
        color: '#181818',
    }),
});

// ---------- LIB ---------
const layerColors = [
    "#ff6666",
    "#66ccff",
    "#66ff99",
    "#ffcc66",
    "#cc99ff",
    "#ff99cc",
    "#99ffcc",
    "#cccc66"
];

let layerIndex = 0;

function createWFSLayer(layerName) {
    const color = layerColors[layerIndex % layerColors.length];
    layerIndex++;

    const layerStyle = new Style({
        fill: new Fill({ color }),
        stroke: new Stroke({ color: "#222", width: 1 }),
    });


    const layer = new VectorLayer({
        source: new VectorSource({
            url: `http://localhost:8080/geoserver/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:${layerName}&outputFormat=application/json&srsname=EPSG:4326`,
            format: new GeoJSON(),
        }),
        visible: false,
        style: layerStyle,
    });

    layer.set('layerName', layerName);
    return layer
}
// ---------- CAPAS ---------
const layersWFS = layers.map((layerInfo) => createWFSLayer(layerInfo[0]));

const capaBaseOSM = new TileLayer({
    source: new OSM(),
});


// ---------- MAPA ---------
function scaleControl() {
    const control = new ScaleLine({
        bar: true,
        steps: 4,
        text: true,
        minWidth: 140,
    });

    return control;
}

const CORRIENTESTIENEPAYE = fromLonLat([-58.82, -27.493]);

const map = new Map({
    controls: defaultControls().extend([scaleControl()]),
    target: "map",
    layers: [capaBaseOSM, ...layersWFS],
    view: new View({
        center: CORRIENTESTIENEPAYE,
        zoom: 12,
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
    view.animate({
        center: CORRIENTESTIENEPAYE,
        zoom: 12,
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

// Source - https://stackoverflow.com/questions/814564/inserting-html-elements-with-javascript
const ulLayers = document.querySelector('.layers');
layers.map((layer) => {
    ulLayers.insertAdjacentHTML(
        'afterbegin',
        `
        <li> <input type="checkbox" id="${layer[0]}"><label for="${layer[0]}">${layer[1]}</label></li>
        `
    );

    layers.forEach((layer, i) => {
        const id = layer[0];
        const input = document.getElementById(id);
        if (!input) return;

        input.checked = layersWFS[i].getVisible();

        input.addEventListener("change", (e) => {
            layersWFS[i].setVisible(e.target.checked);
        });
    });
});

const selectedStyle = new Style({
    fill: new Fill({
        color: 'rgba(255, 165, 0, 0.25)',
    }),
    stroke: new Stroke({
        color: 'rgba(255, 115, 0, 1)',
        width: 2,
    }),
});

const select = new Select({
    style: selectedStyle,
});

map.addInteraction(select);

select.on('select', function() {
    const features = select.getFeatures().getArray();
    for (const feature of features) {
        const props = feature.getProperties()
        console.log(props)
        // console.log(`Dataset:${props.dataset}, escala: ${props.detalle}`)
    }
});



const dragBox = new DragBox({
    condition: platformModifierKeyOnly,
});

map.addInteraction(dragBox);

dragBox.on('boxend', function() {
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

        layersWFS.filter(l => l.getVisible()).forEach(layer => {
            const source = layer.getSource();
            const layerFeatures = source
                .getFeaturesInExtent(extent)
                .filter(f => f.getGeometry().intersectsExtent(extent));

            if (oblique) {
                const anchor = [0, 0];
                const geometry = dragBox.getGeometry().clone();
                geometry.translate(-world * worldWidth, 0);
                geometry.rotate(-rotation, anchor);
                const boxGeomExtent = geometry.getExtent();

                layerFeatures.forEach(feature => {
                    const geom = feature.getGeometry().clone();
                    geom.rotate(-rotation, anchor);
                    if (geom.intersectsExtent(boxGeomExtent)) {
                        select.selectFeature(feature);
                        selected.push({
                            layer: layer.get('layerName'),
                            id: feature.getId(),
                            props: feature.getProperties(),
                        });
                    }
                });
            } else {
                layerFeatures.forEach(feature => {
                    select.selectFeature(feature);
                    selected.push({
                        layer: layer.get('title') || layer.get('name'),
                        id: feature.getId(),
                        props: feature.getProperties(),
                    });
                });
            }
        });
    }

    if (selected.length > 0) {
        console.group(`Selected ${selected.length} features`);
        selected.forEach((f, i) => {
            console.log(`Feature #${i + 1} [${f.layer}]`, f.props);
        });
        console.groupEnd();
    } else {
        console.info("No features selected.");
    }
});

dragBox.on('boxstart', function() {
    select.clearSelection();
});

