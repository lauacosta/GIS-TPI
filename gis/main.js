import OSM from "ol/source/OSM";
import TileLayer from "ol/layer/Tile";
import { Map, View } from "ol";
import { fromLonLat } from "ol/proj";

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([-63.6, -38.4]),
    zoom: 5,
  }),
});

const menuBtn = document.getElementById("menu");
const aside = document.querySelector("aside");

menuBtn.addEventListener("click", () => {
  aside.classList.toggle("menu-open");
});

document.getElementById("center-arg").onclick = function () {
  const view = map.getView();
  view.setCenter(fromLonLat([-63.6, -38.4]));
  view.setZoom(5);
};

document.getElementById("zoom-out").onclick = function () {
  const view = map.getView();
  const zoom = view.getZoom();
  view.setZoom(zoom - 1);
};

document.getElementById("zoom-in").onclick = function () {
  const view = map.getView();
  const zoom = view.getZoom();
  view.setZoom(zoom + 1);
};
