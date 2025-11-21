import { MultiLineString } from "ol/geom";

export function setEmoji(type) {
  const emoji =
    {
      point: "📍",
      MultiPoint: "📍",
      polygon: "⬟",
      MultiPolygon: "⬟",
      line: "➖",
      MultiLineString: "➖",
    }[type] ?? "❓";
  return emoji;
}
