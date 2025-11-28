import WMSCapabilities from "ol/format/WMSCapabilities.js";
import { transform } from "ol/proj.js";
import GML from "ol/format/GML.js";

const BASE_URL = "/geoserver";

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
        `/geoserver/${workspace}/ows?service=WFS&` +
        `version=1.1.0&request=GetFeature&typeName=${workspace}:${layerName}&` +
        `outputFormat=application/json&` +
        `srsname=EPSG:${epsg}&bbox=${extent.join(",")},EPSG:${epsg}`
    );
};

// ...existing code...

/**
 * Inserta una feature en GeoServer usando WFS-T (Web Feature Service - Transactional)
 * @param {string} workspace - Nombre del workspace en GeoServer
 * @param {string} layerName - Nombre de la capa
 * @param {ol.geom.Geometry} geometry - Geometría de OpenLayers
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function insertFeatureWFST(workspace, layerName, geometry) {
  try {
    // Obtener información del namespace desde DescribeFeatureType
    const namespaceInfo = await getFeatureTypeInfo(workspace, layerName);
    
    // Transformar geometría a EPSG:4326 primero
    const geomClone = geometry.clone();
    geomClone.transform("EPSG:3857", "EPSG:4326");
    
    // Generar GML manualmente con las coordenadas correctas
    const geometryGML = geometryToGML(geomClone, namespaceInfo.geometryName);
    
    // Fecha actual para metadata
    const now = new Date().toISOString().split('T')[0];
    
    const wfsTransaction = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:Transaction 
  service="WFS" 
  version="1.1.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:${workspace}="${namespaceInfo.targetNamespace}"
  xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
  <wfs:Insert>
    <${workspace}:${layerName}>
      <${workspace}:${namespaceInfo.geometryName}>${geometryGML}</${workspace}:${namespaceInfo.geometryName}>
      <${workspace}:nombre>Nueva Isla</${workspace}:nombre>
      <${workspace}:tipo>polygon</${workspace}:tipo>
      <${workspace}:fclass>island</${workspace}:fclass>
      <${workspace}:fuente>Digitalizacion Web</${workspace}:fuente>
      <${workspace}:actualizac>${now}</${workspace}:actualizac>
    </${workspace}:${layerName}>
  </wfs:Insert>
</wfs:Transaction>`;

    console.log("Enviando WFS-T:", wfsTransaction);

    const response = await fetch(`${BASE_URL}/${workspace}/wfs`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: wfsTransaction,
    });

    const responseText = await response.text();
    console.log("Respuesta GeoServer:", responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    // Verificar si hay errores en el XML de respuesta
    if (responseText.includes("ExceptionReport") || responseText.includes("ows:Exception")) {
      const errorMatch = responseText.match(/<ows:ExceptionText>(.*?)<\/ows:ExceptionText>/);
      const errorMsg = errorMatch ? errorMatch[1] : responseText;
      throw new Error(errorMsg);
    }

    return { success: true };
  } catch (error) {
    console.error("Error en insertFeatureWFST:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene información del tipo de feature (namespace, nombre del campo de geometría)
 */
async function getFeatureTypeInfo(workspace, layerName) {
  try {
    const url = `${BASE_URL}/${workspace}/wfs?service=WFS&version=1.1.0&request=DescribeFeatureType&typeName=${workspace}:${layerName}`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    
    // Obtener el targetNamespace
    const schema = xmlDoc.querySelector("schema, xsd\\:schema");
    const targetNamespace = schema?.getAttribute("targetNamespace") || `http://geoserver.org/${workspace}`;
    
    // Buscar el campo de geometría (puede ser 'geom', 'the_geom', 'geometry', etc.)
    const elements = xmlDoc.querySelectorAll("element[type*='gml'], xsd\\:element[type*='gml']");
    let geometryName = "geom"; // Default
    
    if (elements.length > 0) {
      geometryName = elements[0].getAttribute("name");
    }
    
    console.log("Feature type info:", { targetNamespace, geometryName });
    
    return { targetNamespace, geometryName };
  } catch (error) {
    console.warn("No se pudo obtener DescribeFeatureType, usando valores por defecto:", error);
    return {
      targetNamespace: `http://geoserver.org/${workspace}`,
      geometryName: "geom"
    };
  }
}

/**
 * Convierte una geometría de OpenLayers a formato GML 3.1.1
 * IMPORTANTE: La geometría YA debe estar en EPSG:4326 antes de llamar esta función
 */
function geometryToGML(geometry, geometryFieldName = "geom") {
  const type = geometry.getType();
  const coords = geometry.getCoordinates();
  
  switch (type) {
    case "Point":
      // GML usa lon,lat (X,Y) para EPSG:4326
      return `<${geometryFieldName}>
        <gml:Point srsName="EPSG:4326">
          <gml:pos>${coords[0]} ${coords[1]}</gml:pos>
        </gml:Point>
      </${geometryFieldName}>`;
      
    case "LineString":
      // Coordenadas como lon lat lon lat...
      const lineCoords = coords.map(c => `${c[0]} ${c[1]}`).join(" ");
      return `<${geometryFieldName}>
        <gml:LineString srsName="EPSG:4326">
          <gml:posList>${lineCoords}</gml:posList>
        </gml:LineString>
      </${geometryFieldName}>`;
      
    case "Polygon":
      // Anillo exterior con coordenadas lon lat lon lat...
      const exteriorRing = coords[0].map(c => `${c[0]} ${c[1]}`).join(" ");
      return `<${geometryFieldName}>
        <gml:Polygon srsName="EPSG:4326">
          <gml:exterior>
            <gml:LinearRing>
              <gml:posList>${exteriorRing}</gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </${geometryFieldName}>`;
      
    default:
      throw new Error(`Tipo de geometría no soportado: ${type}`);
  }
}