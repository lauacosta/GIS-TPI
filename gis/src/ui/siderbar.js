let activeMenu = "";
let dom = {};

export const updateMenu = (update) => {
  activeMenu = update;
  dom.tables.classList.remove("active-menu");
  dom.legends.classList.remove("active-menu");
  dom.layers.classList.remove("active-menu");

  switch (activeMenu) {
    case "tables":
      dom.tables.classList.add("active-menu");
      break;
    case "legends":
      dom.legends.classList.add("active-menu");
      break;

    default:
      dom.layers.classList.add("active-menu");

      break;
  }
  return activeMenu;
};

export const initSidebar = () => {
  dom = {
    menuBtn: document.getElementById("menu"),
    aside: document.querySelector("aside"),
    escala: document.querySelector(".ol-scale-bar"),
    layers: document.getElementById("layers"),
    tables: document.getElementById("tables"),
    legends: document.getElementById("legends"),
  };

  dom.menuBtn.addEventListener("click", () => {
    dom.aside.classList.toggle("menu-open");
    if (dom.escala.style.left == "4.5rem") {
      dom.escala.style.left = "400px";
    } else {
      dom.escala.style.left = "4.5rem";
    }
  });

  dom.layers.addEventListener("click", () => {
    updateMenu("layers");
  });
  dom.tables.addEventListener("click", () => {
    updateMenu("tables");
  });
  dom.legends.addEventListener("click", () => {
    updateMenu("legends");
  });

  updateMenu("layers");
};
