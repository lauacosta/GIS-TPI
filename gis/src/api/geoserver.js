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
export async function insertFeatureWFST(workspace, layerName, geometry, attributes = {}) {
  try {
    // Obtener información del namespace y campos desde DescribeFeatureType
    const namespaceInfo = await getFeatureTypeInfo(workspace, layerName);

    // Transformar geometría a EPSG:4326 primero
    const geomClone = geometry.clone();
    geomClone.transform("EPSG:3857", "EPSG:4326");

    // Generar GML manualmente con las coordenadas correctas
    const geometryGML = geometryToGML(geomClone, namespaceInfo.geometryName);

    // Generar campos dinámicamente basándose en el schema de la capa
    let fieldsXML = '';
    
    if (namespaceInfo.fields && namespaceInfo.fields.length > 0) {
      namespaceInfo.fields.forEach(field => {
        // Usar valor proporcionado o generar uno por defecto
        let value = attributes[field.name];
        
        if (value === undefined || value === null) {
          // Generar valores por defecto inteligentes según el tipo
          if (field.name.toLowerCase().includes('fecha') || 
              field.name.toLowerCase().includes('actualizac') ||
              field.name.toLowerCase().includes('date')) {
            value = new Date().toISOString().split('T')[0];
          } else if (field.name.toLowerCase().includes('nombre') || 
                     field.name.toLowerCase().includes('name')) {
            value = `Nuevo ${layerName}`;
          } else if (field.type === 'int' || field.type === 'integer' || field.type === 'long') {
            value = 0;
          } else if (field.type === 'double' || field.type === 'float' || field.type === 'decimal') {
            value = 0.0;
          } else if (field.type === 'boolean') {
            value = false;
          } else {
            // Por defecto, string vacío o NULL para campos opcionales
            // Omitir el campo si no hay valor (GeoServer usará NULL o default)
            return;
          }
        }
        
        // Agregar el campo al XML
        fieldsXML += `\n      <${workspace}:${field.name}>${value}</${workspace}:${field.name}>`;
      });
    }

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
      <${workspace}:${namespaceInfo.geometryName}>${geometryGML}</${workspace}:${namespaceInfo.geometryName}>${fieldsXML}
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
    if (
      responseText.includes("ExceptionReport") ||
      responseText.includes("ows:Exception")
    ) {
      const errorMatch = responseText.match(
        /<ows:ExceptionText>(.*?)<\/ows:ExceptionText>/
      );
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
 * Obtiene información del tipo de feature (namespace, nombre del campo de geometría, y todos los campos)
 */
export async function getFeatureTypeInfo(workspace, layerName) {
  try {
    const url = `${BASE_URL}/${workspace}/wfs?service=WFS&version=1.1.0&request=DescribeFeatureType&typeName=${workspace}:${layerName}`;

    const response = await fetch(url);
    const text = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    // Obtener el targetNamespace
    const schema = xmlDoc.querySelector("schema, xsd\\:schema");
    const targetNamespace =
      schema?.getAttribute("targetNamespace") ||
      `http://geoserver.org/${workspace}`;

    // Obtener TODOS los elementos (campos) de la capa
    const allElements = xmlDoc.querySelectorAll(
      "element, xsd\\:element"
    );
    
    let geometryName = "geom"; // Default
    let geometryType = "Point";
    const fields = []; // Lista de campos no-geométricos

    allElements.forEach(element => {
      const name = element.getAttribute("name");
      const type = element.getAttribute("type");
      
      if (!name) return;

      // Si es un campo de geometría
      if (type && type.includes("gml")) {
        geometryName = name;
        
        // Traducir de GML a OpenLayers (Point, LineString, Polygon)
        if (type.includes("Polygon") || type.includes("Surface")) {
          geometryType = "Polygon";
        } else if (type.includes("Line") || type.includes("Curve")) {
          geometryType = "LineString";
        } else if (type.includes("Point")) {
          geometryType = "Point";
        }
      } else {
        // Es un campo normal (atributo)
        fields.push({
          name,
          type: type ? type.replace(/xsd:|xs:/, '') : 'string'
        });
      }
    });

    console.log("Feature type info:", { 
      targetNamespace, 
      geometryName, 
      geometryType,
      fields 
    });

    return { targetNamespace, geometryName, geometryType, fields };
  } catch (error) {
    console.warn(
      "No se pudo obtener DescribeFeatureType, usando valores por defecto:",
      error
    );
    return {
      targetNamespace: `http://geoserver.org/${workspace}`,
      geometryName: "geom",
      geometryType: "Point",
      fields: []
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
      const lineCoords = coords.map((c) => `${c[0]} ${c[1]}`).join(" ");
      return `<${geometryFieldName}>
        <gml:LineString srsName="EPSG:4326">
          <gml:posList>${lineCoords}</gml:posList>
        </gml:LineString>
      </${geometryFieldName}>`;

    case "Polygon":
      // Anillo exterior con coordenadas lon lat lon lat...
      const exteriorRing = coords[0].map((c) => `${c[0]} ${c[1]}`).join(" ");
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

/**
 * Elimina una feature de GeoServer usando WFS-T (Delete)
 * @param {string} workspace - Nombre del workspace en GeoServer
 * @param {string} layerName - Nombre de la capa
 * @param {string} featureId - ID de la feature a eliminar (ej: "isla.1")
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteFeatureWFST(workspace, layerName, featureId) {
  try {
    const namespaceInfo = await getFeatureTypeInfo(workspace, layerName);

    const wfsTransaction = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:Transaction 
  service="WFS" 
  version="1.1.0"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:${workspace}="${namespaceInfo.targetNamespace}"
  xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
  <wfs:Delete typeName="${workspace}:${layerName}">
    <ogc:Filter>
      <ogc:FeatureId fid="${featureId}"/>
    </ogc:Filter>
  </wfs:Delete>
</wfs:Transaction>`;

    console.log("Enviando WFS-T Delete:", wfsTransaction);

    const response = await fetch(`${BASE_URL}/${workspace}/wfs`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: wfsTransaction,
    });

    const responseText = await response.text();
    console.log("Respuesta GeoServer (Delete):", responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    // Verificar si hay errores en el XML de respuesta
    if (
      responseText.includes("ExceptionReport") ||
      responseText.includes("ows:Exception")
    ) {
      const errorMatch = responseText.match(
        /<ows:ExceptionText>(.*?)<\/ows:ExceptionText>/
      );
      const errorMsg = errorMatch ? errorMatch[1] : responseText;
      throw new Error(errorMsg);
    }

    // Verificar si se eliminó alguna feature
    const deletedMatch = responseText.match(
      /<wfs:totalDeleted>(\d+)<\/wfs:totalDeleted>/
    );
    const deletedCount = deletedMatch ? parseInt(deletedMatch[1]) : 0;

    if (deletedCount === 0) {
      throw new Error("No se eliminó ninguna feature");
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Error en deleteFeatureWFST:", error);
    return { success: false, error: error.message };
  }
}
