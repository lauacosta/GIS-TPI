import { Style, Stroke, Fill, Circle } from "ol/style";
import CircleStyle from 'ol/style/Circle.js';

export const selectedStyle = new Style({
    fill: new Fill({
        color: "rgba(255, 165, 0, 0.25)",
    }),
    stroke: new Stroke({
        color: "rgba(255, 115, 0, 1)",
        width: 2,
    }),
});

export const selectedPointStyle = new Style({
    image: new Circle({
        radius: 8,
        fill: new Fill({ color: "rgba(255,165,0,0.9)" }),
        stroke: new Stroke({ color: "rgba(255,115,0,1)", width: 2 }),
    }),
});

export const selectedLineStyle = new Style({
    stroke: new Stroke({
        color: "rgba(255, 115, 0, 1)",
        width: 3,
    }),
});

export const measureLineStyle = new Style({
    stroke: new Stroke({
        color: "rgba(255, 115, 0, 1)",
        width: 2,
    }),
    fill: new Fill({
        color: "rgba(255, 165, 0, 0.25)",
    }),
});

export const activeDrawStyle = new Style({
    fill: new Fill({
        color: 'rgba(168, 168, 168, 0.25)',
    }),
    stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
    }),
    image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
    }),
});


export const createLayerStyle = (color) => {
    return {
        point: new Style({
            image: new Circle({
                radius: 6,
                fill: new Fill({ color }),
                stroke: new Stroke({ color: "#222", width: 1 }),
            }),
        }),
        line: new Style({
            stroke: new Stroke({
                color,
                width: 3,
                lineCap: "round",
                lineJoin: "round",
            }),
        }),
        polygon: new Style({
            fill: new Fill({ color }),
            stroke: new Stroke({ color: "#222", width: 1 }),
        }),
    };
};
