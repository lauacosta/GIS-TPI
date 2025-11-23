import { Style, Stroke, Fill, Circle, RegularShape } from "ol/style";
import Point from 'ol/geom/Point.js';
import CircleStyle from 'ol/style/Circle.js';
import Text from 'ol/style/Text.js';

export const selectedPolygonStyle = new Style({
    zIndex: 1000,
    fill: new Fill({
        color: "rgba(255, 165, 0, 0.25)",
    }),
    stroke: new Stroke({
        color: "rgba(255, 115, 0, 1)",
        width: 2,
    }),
});

export const measureToolTip = (text) => {
    return [
        new Style({
            text: new Text({
                text: text,
                font: "bold 14px sans-serif",
                fill: new Fill({ color: "black" }),

                backgroundFill: new Fill({
                    color: "#ff7300",
                }),

                backgroundStroke: new Stroke({
                    color: "#ff7300",
                    width: 2,
                }),

                padding: [4, 6, 4, 6],
                offsetY: -18,
                overflow: true,
            }),
        }),

        new Style({
            image: new RegularShape({
                points: 3,
                radius: 6,
                rotation: Math.PI,
                fill: new Fill({
                    color: "#ff7300",

                }),
                stroke: new Stroke({
                    color: "#ff7300",
                    width: 1,
                }),
            }),
            geometry: function(feature) {
                const point = feature.getGeometry();
                const coords = point.getCoordinates();
                // Move triangle slightly down from the text box center
                return new Point([coords[0], coords[1] - 5]);
            },
        }),
    ];
};

export const selectedPointStyle = new Style({
    zIndex: 1000,
    image: new Circle({
        radius: 8,
        fill: new Fill({ color: "rgba(255,165,0,0.9)" }),
        stroke: new Stroke({ color: "rgba(255,115,0,1)", width: 2 }),
    }),
});

export const selectedLineStyle = new Style({
    zIndex: 1000,
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
        color: "rgba(168, 168, 168, 0.25)",
    }),
    stroke: new Stroke({
        color: "rgba(0, 0, 0, 0.5)",
        lineDash: [10, 10],
        width: 2,
    }),

    image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
            color: "rgba(0, 0, 0, 0.7)",
        }),
        fill: new Fill({
            color: "rgba(255, 255, 255, 0.2)",
        }),
    }),
});


const superscriptMap = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
};

export function htmlSupToUnicode(text) {
    return text.replace(/<sup>(.*?)<\/sup>/g, (_, digits) => {
        return digits
            .split("")
            .map((d) => superscriptMap[d] ?? d)
            .join("");
    });
}

