const POS_OPEN = "400px";
const POS_CLOSED = "4.6rem";

export function moveScale(isOpen) {
  const scale = document.querySelector(".ol-scale-bar");

  if (scale) {
    scale.style.left = isOpen ? POS_OPEN : POS_CLOSED;
  }
}
