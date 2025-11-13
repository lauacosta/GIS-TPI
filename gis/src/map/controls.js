import ScaleLine from "ol/control/ScaleLine.js";
import { CORRIENTES_TIENE_PAYE } from "../config/mapConst";

export const scaleControl = () => {
  return new ScaleLine({
    bar: true,
    steps: 4,
    text: true,
    minWidth: 140,
  });
};

export const centerInitialPos = (view) => {
  return view.animate({
    center: CORRIENTES_TIENE_PAYE,
    zoom: 12,
    duration: 1000,
  });
};

export const zoomIn = (view) => {
  return view.animate({
    zoom: view.getZoom() + 1,
    duration: 500,
  });
};

export const zoomOut = (view) => {
  return view.animate({
    zoom: view.getZoom() - 1,
    duration: 500,
  });
};
