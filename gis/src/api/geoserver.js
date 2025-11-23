import WMSCapabilities from "ol/format/WMSCapabilities.js";

const BASE_URL = "http://localhost:8080/geoserver";

export const fetchLayersFromGeoServer = async (workspace) => {
    try {
        const url = `${BASE_URL}/${workspace}/wms?service=WMS&request=GetCapabilities`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Error de GeoServer: ${response.status}`);
        }

        const text = await response.text();
        const parser = new WMSCapabilities();
        const result = parser.read(text);

        const layers = result.Capability.Layer.Layer;

        return layers.map((layer) => {
            const type = layer.Style[0].Name;
            const raw = layer.Name.replace(`${workspace}:`, "");
            const format = raw.replaceAll("_", " ").toLowerCase();

            return [raw, format, type];
        });
    } catch (error) {
        console.error("Error al obtener capas:", error);
        return [];
    }
};

export const getWFSUrl = (workspace, layerName, extent, epsg) => {
    return (
        `http://localhost:8080/geoserver/${workspace}/ows?service=WFS&` +
        `version=1.1.0&request=GetFeature&typeName=${workspace}:${layerName}&` +
        `outputFormat=application/json&` +
        `srsname=EPSG:${epsg}&bbox=${extent.join(",")},EPSG:${epsg}`
    );
};
