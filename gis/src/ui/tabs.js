export function updateTabs(features) {
  const layersList = document.getElementById("selected-layers");
  if (!layersList) return;

  layersList.querySelectorAll("li:not(#map-tab)").forEach((li) => li.remove());

  if (features.length === 0) {
    console.info("No features selected.");
    return;
  }

  const grouped = {};

  features.forEach((f) => {
    const props = f.getProperties();
    const fclass = props.fclass || "Sin clase";

    if (!grouped[fclass]) grouped[fclass] = [];
    grouped[fclass].push(props);
  });

  Object.keys(grouped).forEach((fclass) => {
    const li = document.createElement("li");
    li.textContent = fclass;
    layersList.appendChild(li);
  });

  console.log("Resultados:", grouped);
}
