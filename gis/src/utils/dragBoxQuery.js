import { getWidth } from "ol/extent";

export function getFeaturesInDragBox(dragBox, map, layersWFS) {
    const boxExtent = dragBox.getGeometry().getExtent();
    const view = map.getView();

    const worldExtent = view.getProjection().getExtent();
    const worldWidth = getWidth(worldExtent);
    const startWorld = Math.floor((boxExtent[0] - worldExtent[0]) / worldWidth);
    const endWorld = Math.floor((boxExtent[2] - worldExtent[0]) / worldWidth);

    const rotation = view.getRotation();
    const oblique = rotation % (Math.PI / 2) !== 0;
    const selectedFeatures = [];

    for (let world = startWorld; world <= endWorld; ++world) {
        const left = Math.max(boxExtent[0] - world * worldWidth, worldExtent[0]);
        const right = Math.min(boxExtent[2] - world * worldWidth, worldExtent[2]);
        const extent = [left, boxExtent[1], right, boxExtent[3]];

        // Seleccionamos solo capas visibles
        const visibleLayers = layersWFS.filter((l) => l.getVisible());

        for (const layer of visibleLayers) {
            const source = layer.getSource();
            const candidates = source.getFeaturesInExtent(extent);

            // Lógica de intersección
            const hits = candidates.filter((feature) => {
                let intersects = false;

                if (oblique) {
                    // Lógica de rotación en caso de que sea necesario
                    const anchor = [0, 0];
                    const geometry = dragBox.getGeometry().clone();
                    geometry.translate(-world * worldWidth, 0);
                    geometry.rotate(-rotation, anchor);
                    const boxGeomExtent = geometry.getExtent();

                    const featureGeom = feature.getGeometry().clone();
                    featureGeom.rotate(-rotation, anchor);
                    intersects = featureGeom.intersectsExtent(boxGeomExtent);
                } else {
                    intersects = feature.getGeometry().intersectsExtent(extent);
                }
                return intersects;
            });

            for (const f of hits) {
                f.set("_layerName", layer.get("layerName") || "Capa sin nombre", true);
                selectedFeatures.push(f);
            };
        };
    }

    return selectedFeatures;
}
