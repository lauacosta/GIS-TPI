import { setEmoji } from "../utils/setEmoji";

// Variable para mantener la capa seleccionada
export let selectedLayer = null;

export function initLayerList(map, wfsLayers, layersData) {
  const ulLayers = document.querySelector(".layers");
  const searchInput = document.querySelector("#layer-search");
  const cleanButton = document.querySelector(".clean-selection");

  // Verificar que los elementos existan
  if (!ulLayers || !searchInput) {
    console.error("No se encontraron los elementos del DOM necesarios");
    return;
  }

  // Validar que layersData sea un array
  if (!Array.isArray(layersData)) {
    console.error("layersData no es un array:", layersData);
    return;
  }

  console.log("initLayerList llamado con:", {
    layersCount: layersData.length,
    wfsLayersCount: wfsLayers.length,
  });

  function makeCheckboxHandler(targetLayer, checkbox) {
    return function handleCheckboxChangeEvent() {
      targetLayer.setVisible(checkbox.checked);
      updateCleanButton();

      if (typeof globalUpdateLegends !== "undefined" && globalUpdateLegends) {
        globalUpdateLegends();
      }
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

    if (typeof globalUpdateLegends !== "undefined" && globalUpdateLegends) {
      globalUpdateLegends();
    }
  }

  function renderList(list) {
    ulLayers.innerHTML = "";

    // Validar que list sea un array
    if (!Array.isArray(list)) {
      console.error("renderList: list no es un array", list);
      return;
    }

    for (const [layerName, label, type] of list) {
      const targetLayer = wfsLayers.find(
        (l) => l.get("layerName") === layerName
      );

      if (!targetLayer) continue; // Saltar si no se encuentra la capa

      ulLayers.insertAdjacentHTML(
        "beforeend",
        `<li class="layer-item">
          <button class="edit-button" title="Editar capa" data-layer-name="${layerName}">
            <img
              src="./assets/pencil-edit-02-stroke-rounded.svg"
              alt="Dibujar vector"
            />
          </button>
          <div class="divider"></div>
          <label for="${layerName}">
            <input type="checkbox" id="${layerName}">
            <span class="layer-symbol">${setEmoji(type)}</span>
            <span class="layer-name">${label}</span>
          </label>
        </li>`
      );

      const checkbox = document.querySelector(`#${layerName}`);
      if (!checkbox) continue;

      checkbox.checked = targetLayer.getVisible();

      const handler = makeCheckboxHandler(targetLayer, checkbox);
      checkbox.addEventListener("change", handler);

      const layerItem = checkbox.closest("li");
      const editBtn = layerItem.querySelector(".edit-button");

      if (editBtn) {
        editBtn.addEventListener("click", () => {
          console.log("Activando edición para:", layerName);

          document.querySelectorAll(".layer-item").forEach((item) => {
            item.classList.remove("selected");
          });

          layerItem.classList.add("selected");

          selectedLayer = {
            name: layerName,
            label: label,
            type: type,
            olLayer: targetLayer,
            workspace: "TPI_GIS",
          };
        });
      }
    }
  }

  function updateCleanButton() {
    const anyChecked = wfsLayers.some((layer) => layer.getVisible());
    if (cleanButton) {
      cleanButton.disabled = !anyChecked;
    }
  }

  searchInput.addEventListener("input", handleSearchInput);

  if (cleanButton) {
    cleanButton.addEventListener("click", () => {
      handleCleanClick();

      document.querySelectorAll(".layer-item").forEach((item) => {
        item.classList.remove("selected");
      });
      selectedLayer = null;
      console.log("Selección de capa limpiada");
    });
  }

  renderList(layersData);
}

export function getSelectedLayer() {
  return selectedLayer;
}
