export function updateTabs(features) {
    const layersList = document.querySelector("#selected-layers");
    if (!layersList) return;

    const items = layersList.querySelectorAll("li:not(#map-tab)");
    for (const li of items) {
        li.remove()
    }

    if (features.length === 0) {
        console.info("No features selected.");
        return;
    }

    const grouped = {};
    for (const feat of features) {
        const properties = feat.getProperties();
        const fclass = properties.fclass || "Sin clase";

        if (!grouped[fclass]) grouped[fclass] = [];
        grouped[fclass].push(properties);
    };

    const keys = Object.keys(grouped);
    for (const fclass of keys) {
        const li = document.createElement("li");
        li.textContent = fclass;
        layersList.append(li);
    };

    console.log("Resultados:", grouped);
}
