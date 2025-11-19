import { centerInitialPos, zoomIn, zoomOut } from "../map/controls";

export function initToolbar(map, interactionControls) {
  const dom = {
    center: document.getElementById("centerInitialPos"),
    zoomout: document.getElementById("zoom-out"),
    zoomin: document.getElementById("zoom-in"),
    query: document.getElementById("query"),
  };

  dom.center.addEventListener("click", () => {
    centerInitialPos(map.getView());
  });

  dom.zoomout.addEventListener("click", () => {
    zoomOut(map.getView());
  });

  dom.zoomin.addEventListener("click", () => {
    zoomIn(map.getView());
  });

  if (dom.query) {
    let queryMode = false;

    const toggle_query = () => {
      queryMode = !queryMode;

      dom.query.classList.toggle("active");

      if (queryMode) {
        interactionControls.enableQueryMode();
      } else {
        interactionControls.disableQueryMode();
      }
    };

    dom.query.addEventListener("click", toggle_query);

    // (Lautaro) Como hasta ahora no tenemos otros shortcuts, lo dejo aca;
    window.addEventListener("keydown", (e) => {
      if (e.key === "F" || (e.key === "Escape" && queryMode)) {
        toggle_query();
      }
    });
  }
}
