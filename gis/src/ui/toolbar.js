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

    dom.query.addEventListener("click", () => {
      queryMode = !queryMode;

      dom.query.classList.toggle("active");

      if (queryMode) {
        interactionControls.enableQueryMode();
      } else {
        interactionControls.disableQueryMode();
      }
    });
  }
}
