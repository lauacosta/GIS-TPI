import { jsPDF } from "jspdf";

const DIMS = {
  a0: [1189, 841],
  a1: [841, 594],
  a2: [594, 420],
  a3: [420, 297],
  a4: [297, 210],
  a5: [210, 148],
};

export function generatePdf(map, format = "a4", wfsLayers, layersData) {
  return new Promise((resolve, reject) => {
    try {
      const resolution = 125; // dpi
      const dim = DIMS[format];
      const width = Math.round((dim[0] * resolution) / 25.4);
      const height = Math.round((dim[1] * resolution) / 25.4);

      const view = map.getView();
      const originalSize = map.getSize();
      const originalResolution = view.getResolution();

      const scale = resolution / 96;
      const exportResolution = view.getResolution() / scale;

      view.setResolution(exportResolution);
      map.setSize([width, height]);

      map.once("rendercomplete", () => {
        try {
          const exportCanvas = document.createElement("canvas");
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ctx = exportCanvas.getContext("2d");

          const layerCanvases = document.querySelectorAll(".ol-layer canvas");
          layerCanvases.forEach((canvas) => {
            if (canvas.width <= 0) return;
            const opacity = canvas.parentNode.style.opacity;
            ctx.globalAlpha = opacity === "" ? 1 : Number(opacity);
            const transform = canvas.style.transform;
            const matrix = transform
              .match(/^matrix\(([^\)]*)\)$/)[1]
              .split(",")
              .map(Number);
            ctx.setTransform(...matrix);
            ctx.drawImage(canvas, 0, 0);
          });

          ctx.globalAlpha = 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);

          drawScaleBar(map, ctx, width, height, scale);
          drawNorthArrow(ctx, width, height, scale);
          drawLegend(ctx, width, height, scale, wfsLayers, layersData);

          const pdf = new jsPDF("landscape", undefined, format);
          pdf.addImage(
            exportCanvas.toDataURL("image/png"),
            "PNG",
            0,
            0,
            dim[0],
            dim[1]
          );
          pdf.save("map.pdf");

          view.setResolution(originalResolution);
          map.setSize(originalSize);

          resolve();
        } catch (error) {
          view.setResolution(originalResolution);
          map.setSize(originalSize);
          reject(error);
        }
      });

      map.renderSync();
    } catch (error) {
      reject(error);
    }
  });
}

function getMetersPerUnit(unit) {
  const table = {
    m: 1,
    meter: 1,
    meters: 1,
    degrees: 111319.49079327357,
    ft: 0.3048,
  };
  return table[unit] || 1;
}

function niceScaleDistance(d) {
  const base = Math.pow(10, Math.floor(Math.log10(d)));
  for (const step of [1, 2, 5]) {
    const val = step * base;
    if (val >= d) return val;
  }
  return 10 * base;
}

function drawScaleBar(map, ctx, canvasWidth, canvasHeight, scale) {
  const view = map.getView();
  const proj = view.getProjection();
  const resolution = view.getResolution();
  const metersPerPixel =
    (resolution * getMetersPerUnit(proj.getUnits())) / window.devicePixelRatio;

  const barMaxPx = 180 * scale;
  const barHeight = 10 * scale;
  const padding = 35 * scale;
  const fontSize = 18 * scale;

  const rawMeters = metersPerPixel * barMaxPx;
  const niceMeters = niceScaleDistance(rawMeters);
  const totalWidthPx = niceMeters / metersPerPixel;

  const label =
    niceMeters >= 1000
      ? `${(niceMeters / 1000).toFixed(0)} km`
      : `${niceMeters} m`;

  const x0 = padding;
  const y0 = canvasHeight - padding;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 10 * scale;
  ctx.fillStyle = "white";
  ctx.fillRect(
    x0 - 10 * scale,
    y0 - barHeight - 50 * scale,
    totalWidthPx + 20 * scale,
    barHeight + 65 * scale
  );
  ctx.restore();

  const segmentWidth = totalWidthPx / 4;
  const colors = ["#000", "#fff", "#000", "#fff"];
  ctx.lineWidth = 1.4 * scale;
  ctx.strokeStyle = "#000";

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(
      x0 + i * segmentWidth,
      y0 - barHeight,
      segmentWidth,
      barHeight
    );
    ctx.strokeRect(
      x0 + i * segmentWidth,
      y0 - barHeight,
      segmentWidth,
      barHeight
    );
  }

  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const tx = x0 + i * segmentWidth;
    ctx.moveTo(tx, y0 - barHeight - 4 * scale);
    ctx.lineTo(tx, y0 - barHeight + barHeight + 4 * scale);
  }
  ctx.stroke();

  ctx.font = `${fontSize}px Arial`;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";
  ctx.fillStyle = "#000";
  ctx.fillText(label, x0, y0 - barHeight - 12 * scale);
}

function drawNorthArrow(ctx, canvasWidth, canvasHeight, scale) {
  const size = 40 * scale;
  const padding = 40 * scale;
  const cx = canvasWidth - padding;
  const cy = padding + size;

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx - size * 0.45, cy);
  ctx.lineTo(cx + size * 0.45, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.7);
  ctx.lineTo(cx - size * 0.32, cy);
  ctx.lineTo(cx + size * 0.32, cy);
  ctx.closePath();
  ctx.fill();

  ctx.font = `${22 * scale}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "#000";
  ctx.fillText("N", cx, cy - size - 6 * scale);
}

function drawLegend(ctx, width, height, scale, wfsLayers, layersData) {
  const styles = {
    fontFamily: '"Noto Sans JP", sans-serif',
    bgColor: "rgb(255, 254, 251)",
    borderColor: "#d8d6cf",
    shadowColor: "rgba(149, 157, 165, 0.2)",
    textColor: "#333",
    radius: 8 * scale,
  };

  if (!wfsLayers || !layersData) return;

  const visibleItems = wfsLayers
    .filter((l) => l.getVisible())
    .map((layer) => {
      const name = layer.get("layerName");
      const data = layersData.find(([n]) => n === name);

      return data
        ? {
            label: data[1],
            type: data[2] || "Polygon",
            color: getLayerColor(layer),
          }
        : null;
    })
    .filter((item) => item !== null);

  if (visibleItems.length === 0) return;

  const fontSize = 14 * scale;
  const lineHeight = 24 * scale;
  const headerHeight = 40 * scale;
  const padding = 20 * scale;
  const iconSize = 14 * scale;

  ctx.font = `${fontSize}px ${styles.fontFamily}`;
  let maxTextWidth = 0;
  visibleItems.forEach((item) => {
    const w = ctx.measureText(item.label).width;
    if (w > maxTextWidth) maxTextWidth = w;
  });

  const boxWidth = maxTextWidth + iconSize + padding * 3;
  const boxHeight = headerHeight + visibleItems.length * lineHeight + padding;

  const x = width - boxWidth - 20 * scale;
  const y = 20 * scale;

  // Sombra
  ctx.save();
  ctx.shadowColor = styles.shadowColor;
  ctx.shadowBlur = 15 * scale;
  ctx.shadowOffsetY = 8 * scale;
  ctx.fillStyle = styles.bgColor;
  drawRoundedRect(ctx, x, y, boxWidth, boxHeight, styles.radius);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Borde
  ctx.lineWidth = 1 * scale;
  ctx.strokeStyle = styles.borderColor;
  ctx.stroke();
  ctx.restore();

  // Título
  ctx.fillStyle = "#000";
  ctx.font = `bold ${15 * scale}px ${styles.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Información", x + padding, y + headerHeight / 2);

  ctx.beginPath();
  ctx.moveTo(x + padding, y + headerHeight - 5 * scale);
  ctx.lineTo(x + boxWidth - padding, y + headerHeight - 5 * scale);
  ctx.strokeStyle = "#eee";
  ctx.stroke();

  // Items
  ctx.font = `${fontSize}px ${styles.fontFamily}`;
  visibleItems.forEach((item, index) => {
    const rowY = y + headerHeight + index * lineHeight + lineHeight / 2;
    const iconX = x + padding;
    const textX = x + padding + iconSize + 10 * scale;

    ctx.fillStyle = item.color;
    ctx.strokeStyle = item.color;

    if (item.type.toLowerCase().includes("point")) {
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2, rowY, iconSize / 2, 0, 2 * Math.PI);
      ctx.fill();
    } else if (item.type.toLowerCase().includes("line")) {
      ctx.beginPath();
      ctx.moveTo(iconX, rowY);
      ctx.lineTo(iconX + iconSize, rowY);
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    } else {
      ctx.fillRect(iconX, rowY - iconSize / 2, iconSize, iconSize);
    }

    ctx.fillStyle = styles.textColor;
    ctx.fillText(item.label, textX, rowY);
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getLayerColor(layer) {
  // Implementa tu lógica para obtener color aquí
  // Ejemplo básico:
  try {
    const style = layer.getStyle();
    // ... lógica para extraer color
    return "#555";
  } catch {
    return "#555";
  }
}
