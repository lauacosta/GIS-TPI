export const initSidebar = () => {
  const dom = {
    menuBtn: document.getElementById("menu"),
    aside: document.querySelector("aside"),
    escala: document.querySelector(".ol-scale-bar"),
  };

  dom.menuBtn.addEventListener("click", () => {
    dom.aside.classList.toggle("menu-open");
    if (dom.escala.style.left == "4.5rem") {
      dom.escala.style.left = "400px";
    } else {
      dom.escala.style.left = "4.5rem";
    }
  });
};
