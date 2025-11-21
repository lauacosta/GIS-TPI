import { setEmoji } from "../utils/setEmoji";

export function initLayerList(layersData, wfsLayers) {
  const ulLayers = document.querySelector(".layers");
  const searchInput = document.querySelector("#layer-search");
  const cleanButton = document.querySelector(".clean-selection");

  function makeCheckboxHandler(targetLayer, checkbox) {
    return function handleCheckboxChangeEvent() {
      targetLayer.setVisible(checkbox.checked);
      updateCleanButton();
    };
  }

  function handleSearchInput(event) {
    const query = event.target.value.toLowerCase();
    const filtered = layersData.filter(
      ([name, label]) =>
        name.toLowerCase().includes(query) ||
        label.toLowerCase().includes(query)
    );
    renderList(filtered);
  }

  function handleCleanClick() {
    for (const layer of wfsLayers) {
      layer.setVisible(false);
    }
    searchInput.dispatchEvent(new Event("input"));
    updateCleanButton();
  }

  function renderList(list) {
    ulLayers.innerHTML = "";

    for (const [layerName, label, type] of list) {
      const targetLayer = wfsLayers.find(
        (l) => l.get("layerName") === layerName
      );

      ulLayers.insertAdjacentHTML(
        "beforeend",
        `<li><input type="checkbox" id="${layerName}"><label for="${layerName}"><span class="layer-symbol">${setEmoji(
          type
        )}</span><span class="layer-name">${label}</span></label></li>`
      );

      const checkbox = document.querySelector(`#${layerName}`);
      checkbox.checked = targetLayer.getVisible();

      const handler = makeCheckboxHandler(targetLayer, checkbox);
      checkbox.addEventListener("change", handler);
    }
  }

  function updateCleanButton() {
    const anyChecked = wfsLayers.some((layer) => layer.getVisible());
    if (cleanButton) {
      cleanButton.style.display = anyChecked ? "inline-block" : "none";
    }
  }

  searchInput.addEventListener("input", handleSearchInput);

  if (cleanButton) {
    cleanButton.addEventListener("click", handleCleanClick);
  }

  renderList(layersData);
}
