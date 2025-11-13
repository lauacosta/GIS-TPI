import { Style, Stroke, Fill, Circle } from "ol/style";

export const selectedStyle = new Style({
  fill: new Fill({
    color: "rgba(255, 165, 0, 0.25)",
  }),
  stroke: new Stroke({
    color: "rgba(255, 115, 0, 1)",
    width: 2,
  }),
});

export const selectedPointStyle = new Style({
  image: new Circle({
    radius: 8,
    fill: new Fill({ color: "rgba(255,165,0,0.9)" }),
    stroke: new Stroke({ color: "rgba(255,115,0,1)", width: 2 }),
  }),
});

export const createLayerStyle = (color) => {
  return {
    point: new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: "#222", width: 1 }),
      }),
    }),
    polygon: new Style({
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#222", width: 1 }),
    }),
  };
};
