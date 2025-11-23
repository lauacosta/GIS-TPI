import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import GeoJSON from "ol/format/GeoJSON";
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import { transformExtent } from "ol/proj";
import { EPSG_ID, workspace } from "../config/mapConst";
import { generateLayerStyle } from "./icon_registry.js";
import { getWFSUrl } from "../api/geoserver";

// const layerColors = [
//     "#ff6666",
//     "#66ccff",
//     "#66ff99",
//     "#ffcc66",
//     "#cc99ff",
//     "#ff99cc",
//     "#99ffcc",
//     "#cccc66",
// ];
// let layerIndex = 0;

const LAYER_Z_INDEX = {
    point: 100,
    multipoint: 100,
    line: 50,
    linestring: 50,
    multilinestring: 50,
    polygon: 10,
    multipolygon: 10,
};

export function createWFSLayer(layerName, type) {
    // const color = layerColors[layerIndex % layerColors.length];
    // layerIndex++;

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
        style: function(feature) {
            const geometryType = feature.getGeometry().getType();
            return generateLayerStyle(layerName, geometryType);
        },
    });
    layer.set("layerName", layerName);

    const normalizedType = type ? type.toLowerCase() : "polygon";

    const zIndex = LAYER_Z_INDEX[normalizedType] || 1;

    layer.setZIndex(zIndex);

    return layer;
}
