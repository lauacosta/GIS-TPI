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
    // console.log(type);
    if (!grouped[fclass]) {
      grouped[fclass] = {
        type: type,
        items: [],
      };
    }
    grouped[fclass].items.push(props);
  });

  const tablesContainer = document.getElementById("tables-container");
  tablesContainer.style.display = "none";
  if (tablesContainer) tablesContainer.innerHTML = "";

  Object.keys(grouped).forEach((fclass) => {
    const groupData = grouped[fclass];
    const type = groupData.type;
    const items = groupData.items;

    const safeId = fclass
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const li = document.createElement("li");

    li.innerHTML = `
    <button class="layer-btn li-item-inspect-table" data-table-id="table-${safeId}">
      <span class="layer-symbol">${setEmoji(type)}</span>
      <span class="layer-name">${fclass}</span>
    </button>
  `;
    ul_layersList.appendChild(li);

    const tableWrapper = document.createElement("div");
    tableWrapper.id = `table-${safeId}`;
    tableWrapper.className = "attribute-table-wrapper";
    tableWrapper.style.display = "none";

    if (items.length > 0) {
      const allKeys = Object.keys(items[0]).filter((k) => k !== "geometry");
      const columns = allKeys.filter((key) => {
        return items.some((item) => {
          const val = item[key];
          if (val === null || val === undefined) return false;
          if (typeof val === "string" && val.trim() === "") return false;
          if (val === 0 || val === "0") return false;
          return true;
        });
      });

      if (columns.length === 0) {
        tableWrapper.innerHTML = `<p>No hay atributos visibles para ${fclass}</p>`;
      } else {
        const tableHTML = `
          <div class="table-header-row">
              <h3>${fclass}</h3>
              <button class="close-table-btn" title="Cerrar tabla">
                  <img src="/assets/cancel-01-stroke-rounded.svg" alt="Cerrar" />
              </button>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>${columns.map((col) => `<th>${col}</th>`).join("")}</tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                  <tr>
                    ${columns
                      .map((col) => `<td>${item[col] || ""}</td>`)
                      .join("")}
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
        tableWrapper.innerHTML = tableHTML;
      }
    } else {
      tableWrapper.innerHTML = `<p>No hay datos para ${fclass}</p>`;
    }

    if (tablesContainer) tablesContainer.appendChild(tableWrapper);

    const btn = li.querySelector(".layer-btn");
    btn.addEventListener("click", () => {
      document.querySelectorAll(".attribute-table-wrapper").forEach((t) => {
        t.style.display = "none";
      });

      const targetTable = document.getElementById(`table-${safeId}`);
      if (targetTable) {
        tablesContainer.style.display = "block";
        targetTable.style.display = "block";
      }

      const tabTablesBtn = document.querySelector(
        '.icon-container[data-target="tables"]'
      );
      if (tabTablesBtn) tabTablesBtn.click();
    });

    const closeBtn = tableWrapper.querySelector(".close-table-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        tableWrapper.style.display = "none";
        tablesContainer.style.display = "none";
      });
    }
  });

  console.log("Resultados:", grouped);
}
