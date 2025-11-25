import { setEmoji } from '../utils/setEmoji';

// Global states for the currently selected layer and its OL instance
let selectedLayerData = null;
let selectedOLLayer = null;

export function initLayerList(layersData, wfsLayers) {
  const ulLayers = document.querySelector('.layers');
  const searchInput = document.querySelector('#layer-search');
  const cleanButton = document.querySelector('.clean-selection');

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
    searchInput.value = '';
    renderList(layersData);
    updateCleanButton();

    if (globalThis.globalUpdateLegends) {
      globalThis.globalUpdateLegends();
    }
  }

  function handleCheckboxChange(event) {
    const layerName = event.target.dataset.layername;
    const isChecked = event.target.checked;
    for (const layer of wfsLayers) {
      if (layer.get('layerName') === layerName) {
        layer.setVisible(isChecked);
      }
    }
    updateCleanButton();
    if (globalThis.globalUpdateLegends) {
      globalThis.globalUpdateLegends();
    }
  }

  function highlightSelectedLayer() {
    // Remove highlight from all
    for (const li of ulLayers.querySelectorAll('li')) {
      li.style.backgroundColor = '';
    }
    // Highlight if a layer is selected
    if (selectedLayerData && selectedOLLayer) {
      const id = selectedLayerData[0];
      const li = ulLayers.querySelector(`button.select-layer[data-layername="${id}"]`)?.parentElement;
      if (li) {
        li.style.backgroundColor = 'rgba(255, 165, 0, 0.25)';
      }
    }
  }

  function handleSelectLayer(event) {
    const layerName = event.currentTarget.dataset.layername;
    selectedLayerData = layersData.find(([name]) => name === layerName);
    selectedOLLayer = wfsLayers.find((l) => l.get('layerName') === layerName);
    highlightSelectedLayer();
  }

  function renderList(list) {
    ulLayers.innerHTML = '';
    for (const [layerName, label, type] of list) {
      const visibleLayer = wfsLayers.find(
        (l) => l.get('layerName') === layerName
      );
      const checked =
        visibleLayer && visibleLayer.getVisible() ? 'checked' : '';
      ulLayers.insertAdjacentHTML(
        'beforeend',
        `<li>
          <input type="checkbox" id="${layerName}" data-layername="${layerName}" ${checked}/>
          <button class="select-layer" data-layername="${layerName}">
            <span class="layer-symbol">${setEmoji(type)}</span>
            <span class="layer-name">${label}</span>
          </button>
        </li>`
      );
    }

    // Attach checkbox listeners after rendering
    for (const checkbox of ulLayers.querySelectorAll(
      'input[type="checkbox"]'
    )) {
      checkbox.removeEventListener('change', handleCheckboxChange);
      checkbox.addEventListener('change', handleCheckboxChange);
    }
    // Attach select-layer listeners after rendering
    for (const button of ulLayers.querySelectorAll('.select-layer')) {
      button.removeEventListener('click', handleSelectLayer);
      button.addEventListener('click', handleSelectLayer);
    }
    highlightSelectedLayer();
  }

  function updateCleanButton() {
    const anyChecked = wfsLayers.some((layer) => layer.getVisible());
    if (cleanButton) {
      cleanButton.style.cursor = anyChecked ? 'pointer' : 'default';
      cleanButton.style.opacity = anyChecked ? '100%' : '20%';
      cleanButton.style.transition = 'all 0.3s ease';
    }
  }

  // Event bindings (only once)
  searchInput.addEventListener("input", handleSearchInput);

  if (cleanButton) {
    cleanButton.addEventListener("click", handleCleanClick);
  }

  renderList(layersData);
  updateCleanButton();
}