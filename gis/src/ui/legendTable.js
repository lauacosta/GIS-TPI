import { Vector as VectorLayer } from 'ol/layer';
import { Polygon } from 'ol/geom';
import { Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Fill, Stroke, Text, RegularShape, Icon } from 'ol/style';
import { getLayerStyle } from "../map/icon_registry";

export function initMapLegend(map, wfsLayers, layersData) {
    const legendSource = new VectorSource();
    const legendLayer = new VectorLayer({
        source: legendSource,
        zIndex: 9999,
        updateWhileAnimating: true,
        updateWhileInteracting: true
    });

    map.addLayer(legendLayer);

    function getGeometrySymbolStyle(layerName, geometryType) {
        const layerStyle = getLayerStyle(layerName, geometryType);
        const type = geometryType.toLowerCase()

        if (type.includes('point')) {
            const image = layerStyle.getImage();

            return new Style({
                image: new Icon({
                    src: image.getSrc(),
                    scale: 0.8,
                    anchor: [0.5, 0.5]
                })
            });
        }

        if (type.includes('line')) {
            const stroke = layerStyle.getStroke();
            return new Style({
                image: new RegularShape({
                    points: 2,
                    radius: 12,
                    stroke: stroke,
                    angle: Math.PI / 2,
                    fill: new Fill({ color: stroke.getColor() })
                })
            });
        }

        const fill = layerStyle.getFill();
        const stroke = layerStyle.getStroke();

        return new Style({
            image: new RegularShape({
                points: 4,
                radius: 12,
                angle: Math.PI / 4,
                fill: fill,
                stroke: stroke
            })
        });
    }

    function updateLegend() {
        legendSource.clear();

        if (!wfsLayers || !Array.isArray(wfsLayers)) {
            console.error('wfsLayers is not a valid array:', wfsLayers);
            return;
        }

        const visibleLayers = wfsLayers.filter(layer => {
            if (!layer) return false;
            try {
                return layer.getVisible();
            } catch (error) {
                console.error('Error checking layer visibility:', error, layer);
                return false;
            }
        });

        if (visibleLayers.length === 0) {
            return;
        }

        const mapSize = map.getSize();

        const padding = 20;
        const legendWidth = 250;
        const lineHeight = 25;
        const headerHeight = 35;

        const totalHeight = headerHeight + visibleLayers.length * lineHeight + 10;

        const pxLeft = mapSize[0] - padding - legendWidth;
        const pxRight = mapSize[0] - padding;

        const pxBottom = mapSize[1] - padding;
        const pxTop = pxBottom - totalHeight;

        const coordTopLeft = map.getCoordinateFromPixel([pxLeft, pxTop]);
        const coordTopRight = map.getCoordinateFromPixel([pxRight, pxTop]);
        const coordBottomLeft = map.getCoordinateFromPixel([pxLeft, pxBottom]);
        const coordBottomRight = map.getCoordinateFromPixel([pxRight, pxBottom]);

        const bg = new Feature({
            geometry: new Polygon([[
                coordTopLeft,
                coordTopRight,
                coordBottomRight,
                coordBottomLeft,
                coordTopLeft
            ]])
        });

        bg.setStyle(
            new Style({
                fill: new Fill({ color: "rgba(255,255,255,0.95)" }),
                stroke: new Stroke({ color: "#333", width: 2 })
            })
        );

        legendSource.addFeature(bg);

        const titlePixel = [pxLeft + legendWidth / 2, pxTop + 18];
        const titleCoord = map.getCoordinateFromPixel(titlePixel);

        const title = new Feature({
            geometry: new Point(titleCoord)
        });

        title.setStyle(
            new Style({
                text: new Text({
                    text: "Información",
                    font: "bold 15px Arial",
                    fill: new Fill({ color: "#000" }),
                    textAlign: "center",
                    textBaseline: "middle"
                })
            })
        );

        legendSource.addFeature(title);

        const sepPixel = [pxLeft + legendWidth / 2, pxTop + headerHeight - 5];
        const sepCoord = map.getCoordinateFromPixel(sepPixel);

        const sep = new Feature({
            geometry: new Point(sepCoord)
        });

        sep.setStyle(
            new Style({
                text: new Text({
                    text: "─".repeat(33),
                    font: "10px Arial",
                    fill: new Fill({ color: "#777" }),
                    textAlign: "center"
                })
            })
        );

        legendSource.addFeature(sep);

        for (const [index, layer] of visibleLayers.entries()) {
            const layerName = layer.get('layerName');
            const layerData = layersData.find(([name]) => name === layerName);

            if (!layerData) continue;

            const [, label, type] = layerData;
            const geometryType = type || "Polygon";

            const rowY = pxTop + headerHeight + index * lineHeight + 12;

            const symbolPixel = [pxLeft + 20, rowY];
            const symbolCoord = map.getCoordinateFromPixel(symbolPixel);

            const symbolFeature = new Feature({
                geometry: new Point(symbolCoord)
            });
            symbolFeature.setStyle(getGeometrySymbolStyle(layerName, geometryType));
            legendSource.addFeature(symbolFeature);

            const labelPixel = [pxLeft + 45, rowY];
            const labelCoord = map.getCoordinateFromPixel(labelPixel);

            const labelFeature = new Feature({
                geometry: new Point(labelCoord)
            });

            labelFeature.setStyle(new Style({
                text: new Text({
                    text: capitalizeWords(label),
                    font: '13px Arial',
                    fill: new Fill({ color: '#000' }),
                    textAlign: 'left',
                    padding: [5, legendWidth - 60, 5, 5]
                })
            }));
            legendSource.addFeature(labelFeature);
        }
    }


    window.globalUpdateLegends = updateLegend;

    map.on('moveend', updateLegend);
    map.getView().on('change:resolution', updateLegend);

    updateLegend();
}

function capitalizeWords(str) {
    return str
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

