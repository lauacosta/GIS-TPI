import { getLayerStyle } from "../map/layerIcons";
import { Icon } from "ol/style"; // Importamos Icon para comprobar el tipo

export function initHtmlLegend(map, wfsLayers, layersData) {
  const listContainer = document.getElementById("legends-list");

  if (!listContainer) {
    console.warn("No se encontró el contenedor #legends-list en el DOM");
    return;
  }

  function renderLegend() {
    const visibleLayers = wfsLayers.filter((layer) => layer.getVisible());
    listContainer.innerHTML = "";

    if (visibleLayers.length === 0) {
      listContainer.innerHTML = `<p>Active una capa para ver su leyenda...</p>`;
      return;
    }

    visibleLayers.forEach((layer) => {
      const layerName = layer.get("layerName");
      const data = layersData.find(([name]) => name === layerName);

      if (!data) return;

      const labelText = capitalizeWords(data[1]);
      const geometryType = data[2] || "Polygon";

      const itemDiv = document.createElement("div");
      itemDiv.className = "legend-item";

      const symbolSpan = document.createElement("span");

      symbolSpan.className = `legend-symbol symbol-${getTypeClass(
        geometryType
      )}`;

      try {
        const style = getLayerStyle(layerName, geometryType);
        const imageStyle = style.getImage();

        if (imageStyle && imageStyle instanceof Icon) {
          const src = imageStyle.getSrc();

          symbolSpan.style.backgroundImage = `url('${src}')`;
          symbolSpan.style.backgroundRepeat = "no-repeat";
          symbolSpan.style.backgroundPosition = "center";
          symbolSpan.style.backgroundSize = "contain";
          symbolSpan.style.backgroundColor = "transparent";
          symbolSpan.style.border = "none";
        } else {
          let color = "#333";

          if (geometryType.toLowerCase().includes("line")) {
            color = style.getStroke() ? style.getStroke().getColor() : "#333";
            symbolSpan.style.backgroundColor = color;

            symbolSpan.style.height = "3px";
            symbolSpan.style.borderRadius = "2px";
            symbolSpan.style.border = "none";
          } else {
            color = style.getFill() ? style.getFill().getColor() : "#333";
            symbolSpan.style.backgroundColor = color;

            symbolSpan.style.height = "";

            if (color.length > 7) {
              symbolSpan.style.border = `1px solid ${color.substring(0, 7)}`;
            }
          }
        }
      } catch (e) {
        console.warn(`Error generando estilo leyenda para ${layerName}:`, e);
        symbolSpan.style.backgroundColor = "#ccc"; // Fallback visual
      }

      const textSpan = document.createElement("span");
      textSpan.innerText = labelText;

      itemDiv.appendChild(symbolSpan);
      itemDiv.appendChild(textSpan);
      listContainer.appendChild(itemDiv);
    });
  }

  wfsLayers.forEach((layer) => {
    layer.on("change:visible", renderLegend);
  });

  renderLegend();
}

function getTypeClass(type) {
  const t = type.toLowerCase();
  if (t.includes("point")) return "point";
  if (t.includes("line")) return "line";
  return "polygon";
}

function capitalizeWords(str) {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
