import { setEmoji } from "../utils/setEmoji";

export function updateTabs(features) {
  const ul_layersList = document.getElementById("selected-layers");
  const p_tableInfo = document.getElementById("table-info");
  if (!ul_layersList || !p_tableInfo) return;

  ul_layersList.querySelectorAll("li").forEach((li) => li.remove());

  if (features.length === 0) {
    p_tableInfo.style.display = "block";
    return;
  }
  p_tableInfo.style.display = "none";

  const grouped = {};

  features.forEach((f) => {
    const props = f.getProperties();
    const fclass = props.fclass || "Sin clase";
    const type = props.geometry.getType();
    console.log(type);
    if (!grouped[fclass]) {
      grouped[fclass] = {
        type: type,
        items: [],
      };
    }
    grouped[fclass].items.push(props);
  });

  Object.keys(grouped).forEach((fclass) => {
    const groupData = grouped[fclass];
    const type = groupData.type;

    const li = document.createElement("li");

    li.innerHTML = `
      <button class="layer-btn">
        <span class="layer-symbol">${setEmoji(type)}</span>
        <span class="layer-name">${fclass}</span>
      </button>
    `;

    ul_layersList.appendChild(li);
  });

  console.log("Resultados:", grouped);
}
