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
    wfsLayersCount: wfsLayers.length
  });

  function makeCheckboxHandler(targetLayer, checkbox) {
    return function handleCheckboxChangeEvent() {
      targetLayer.setVisible(checkbox.checked);
      updateCleanButton();

      if (typeof globalUpdateLegends !== 'undefined' && globalUpdateLegends) {
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

    if (typeof globalUpdateLegends !== 'undefined' && globalUpdateLegends) {
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

      // Agregar funcionalidad de selección al hacer click en el nombre (NO en el checkbox)
      const layerNameSpan = checkbox.parentElement.querySelector(".layer-name");
      const layerSymbol = checkbox.parentElement.querySelector(".layer-symbol");
      const layerItem = checkbox.closest("li");
      
      if (layerNameSpan && layerItem) {
        const clickHandler = (e) => {
          e.stopPropagation(); // Evitar que el click se propague al checkbox
          
          console.log("Click en nombre de capa:", layerName);
          
          // Remover selección previa
          const allItems = document.querySelectorAll(".layer-item");
          allItems.forEach(item => {
            item.classList.remove("selected");
          });
          
          // Marcar como seleccionada
          layerItem.classList.add("selected");
          
          // Guardar referencia a la capa seleccionada
          selectedLayer = {
            name: layerName,
            label: label,
            type: type,
            olLayer: targetLayer,
            workspace: "TPI_GIS"
          };
          
          console.log("✅ Capa seleccionada:", selectedLayer);
        };
        
        // Agregar listener SOLO al nombre y símbolo, NO al checkbox
        layerNameSpan.addEventListener("click", clickHandler);
        if (layerSymbol) {
          layerSymbol.addEventListener("click", clickHandler);
        }
      }
    }
  }

  function updateCleanButton() {
    const anyChecked = wfsLayers.some((layer) => layer.getVisible());
    if (cleanButton) {
      cleanButton.disabled = !anyChecked;
    }
  }

  // Event listener para búsqueda
  searchInput.addEventListener("input", handleSearchInput);

  // Event listener para botón de limpiar
  if (cleanButton) {
    cleanButton.addEventListener("click", () => {
      handleCleanClick();
      
      // Limpiar la selección de capa
      document.querySelectorAll(".layer-item").forEach(item => {
        item.classList.remove("selected");
      });
      selectedLayer = null;
      console.log("Selección de capa limpiada");
    });
  }

  // Renderizar lista inicial
  renderList(layersData);
}

// Función para obtener la capa seleccionada
export function getSelectedLayer() {
  return selectedLayer;
}