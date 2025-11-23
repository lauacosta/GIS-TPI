import { Fill, Icon, Style, Stroke } from 'ol/style';

const ICON_CACHE = {};

function tintSvg(svgText, color) {
    return svgText.replace(/currentColor/g, color);
}

export async function preloadIcons() {
    for (const [cat, cfg] of Object.entries(CATEGORIES)) {
        const response = await fetch(`/assets/${cfg.icon}.svg`);
        const rawSvg = await response.text();
        const tinted = tintSvg(rawSvg, cfg.color);

        ICON_CACHE[cfg.icon] =
            "data:image/svg+xml;utf8," + encodeURIComponent(tinted);
    }
}


// Por como se itera sobre las categorias, conviene que las mas especificas esten primero
export const CATEGORIES = {
    estacion_tren: {
        icon: "train",
        color: "#9c27b0",
        keywords: ["ferroviarios"],
    },

    act_economicas: {
        color: "#c47f00",
        icon: "econ",
        keywords: ["economicas"],
    },

    energia: {
        color: "#cddc39",
        icon: "energy",
        keywords: ["energia"],
    },

    seguridad: {
        color: "#1976d2",
        icon: "security",
        keywords: ["seguridad"],
    },
    comunicacion: {
        color: "#e91e63",
        icon: "coms",
        keywords: ["comunicación"],
    },
    educacion: {
        color: "#0097a7",
        icon: "school",
        keywords: ["educacion"],
    },

    iglesias: {
        icon: "church",
        color: "#ff7350",
        keywords: [
            "religiosos",
        ],
    },

    salud: {
        icon: "salud",
        color: "#ff7300",
        keywords: [
            "salud"
        ],
    },

    buildings: {
        icon: "house",
        color: "#ff7300",
        keywords: [
            "edif", "edificio", "construccion", "construcciones",
            "turisticas", "seguridad",
            "otras_edificaciones"
        ],
    },

    airports: {
        icon: "plane",
        color: "#1e40af",
        keywords: ["aeroportuaria"],
    },

    ports: {
        icon: "boat",
        color: "#1d4ed8",
        keywords: ["portuaria", "portuarias", "obra_portuaria"],
    },

    roads: {
        color: "#666",
        icon: "train",
        keywords: ["red_vial", "vias_secundarias", "vial"],
    },

    hydrology: {
        color: "#2ea8ff",
        icon: "hidro",
        keywords: ["hid", "curso_agua", "espejo", "hidro"],
    },

    vegetation_tree: {
        color: "#8d6e63",
        keywords: ["arborea"],
    },

    vegetation_bush: {
        color: "#558b2f",
        keywords: ["arbustiva"],
    },

    vegetation_crop: {
        color: "#c0ca33",
        keywords: ["cultivos"],
    },

    vegetation_wetland: {
        color: "#26a69a",
        keywords: ["hidrofila"],
    },

    vegetation_bare: {
        color: "#8d6e63",
        keywords: ["suelo_desnudo"],
    },

    political: {
        color: "#d32f2f",
        keywords: ["limite", "provincias", "pais"],
    },

    topo: {
        color: "#a67c52",
        keywords: ["curvas_nivel", "alturas_topograficas"],
    },

    agro: {
        color: "#8f7a2c",
        icon: "farm",
        keywords: ["agropec", "agro"],
    },

    unknown: {
        icon: "dunno",
        color: "#777",
        keywords: [],
    },
};


function classifyByKeywords(layerName) {
    const name = layerName.toLowerCase();

    for (const [category, cfg] of Object.entries(CATEGORIES)) {
        for (const keyword of cfg.keywords) {
            if (name.includes(keyword)) {
                return category;
            }
        }
    }

    return null;
}


function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () =>
        new Array(b.length + 1).fill(0)
    );

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
}


function classifyByFuzzy(layerName) {
    const name = layerName.toLowerCase();

    let bestCategory = "unknown";
    let bestScore = Infinity;

    for (const [category, cfg] of Object.entries(CATEGORIES)) {
        for (const keyword of cfg.keywords) {
            const score = levenshtein(name, keyword);
            if (score < bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }
    }

    return bestScore <= 6 ? bestCategory : "unknown";
}

export function classifyLayer(layerName) {
    const byKeyword = classifyByKeywords(layerName);
    if (byKeyword) return byKeyword;

    const byFuzzy = classifyByFuzzy(layerName);
    return byFuzzy;
}



export function generateLayerStyle(layerName, geometryType) {
    const category = classifyLayer(layerName);
    console.log("Layer:", layerName, "→ Category:", category);

    const cfg = CATEGORIES[category] || CATEGORIES.unknown;


    if (geometryType.includes("Point")) {
        return new Style({
            image: new Icon({
                src: ICON_CACHE[cfg.icon],
                anchor: [0.5, 1],
                scale: 1,
            }),
        });
    }


    if (geometryType.includes("Line")) {
        return new Style({
            stroke: new Stroke({ color: cfg.color, width: 2 }),
        });
    }


    return new Style({
        fill: new Fill({ color: cfg.color + "80" }),
        stroke: new Stroke({ color: "#000", width: 1 }),
    });
}

