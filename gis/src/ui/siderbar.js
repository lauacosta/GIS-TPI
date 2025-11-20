export const initSidebar = () => {
  const menuBtn = document.getElementById("menu"); // El botón hamburguesa
  const aside = document.querySelector("aside"); // El aside dentro del componente
  const escala = document.querySelector(".ol-scale-bar");

  if (menuBtn && aside) {
    menuBtn.addEventListener("click", () => {
      aside.classList.toggle("menu-open");

      // Tu lógica original para mover la escala
      if (escala) {
        if (aside.classList.contains("menu-open")) {
          // Ajusta este valor según el ancho de tu sidebar
          escala.style.left = "400px";
        } else {
          escala.style.left = "4.5rem";
        }
      }
    });
  }
};
