export function initLayerList(layersData, wfsLayers) {
  const ulLayers = document.querySelector(".layers");
  const searchInput = document.getElementById("layer-search");
  const cleanBtn = document.querySelector(".clean-selection");

  function renderList(list) {
    ulLayers.innerHTML = "";

    list.forEach(([layerName, label, type]) => {
      const targetLayer = wfsLayers.find(
        (l) => l.get("layerName") === layerName
      );

      const emoji =
        {
          point: "📍",
          polygon: "⬟",
          line: "➖",
        }[type] ?? "❓";

      ulLayers.insertAdjacentHTML(
        "beforeend",
        `<li><input type="checkbox" id="${layerName}"><label for="${layerName}"><span class="layer-symbol">${emoji}</span> ${label}</label></li>`
      );

      const checkbox = document.getElementById(layerName);

      checkbox.checked = targetLayer.getVisible();

      checkbox.addEventListener("change", () => {
        targetLayer.setVisible(checkbox.checked);
        updateCleanButton();
      });
    });
  }

  function updateCleanButton() {
    const anyChecked = wfsLayers.some((l) => l.getVisible());
    if (cleanBtn) {
      cleanBtn.style.display = anyChecked ? "inline-block" : "none";
    }
  }

  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = layersData.filter(
      ([name, label]) =>
        name.toLowerCase().includes(q) || label.toLowerCase().includes(q)
    );
    renderList(filtered);
  });

  cleanBtn?.addEventListener("click", () => {
    wfsLayers.forEach((l) => l.setVisible(false));
    searchInput.dispatchEvent(new Event("input"));
    updateCleanButton();
  });

  renderList(layersData);
}
