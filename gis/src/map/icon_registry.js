import { Fill, Icon, Style, Stroke } from "ol/style";

export const ICON_CACHE = {};

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
    color: "#7E57C2",
    keywords: ["ferroviarios"],
  },

  act_economicas: {
    icon: "econ",
    color: "#FF8F00",
    keywords: ["economicas"],
  },

  energia: {
    icon: "energy",
    color: "#C0CA33",
    keywords: ["energia"],
  },

  seguridad: {
    icon: "security",
    color: "#0288D1",
    keywords: ["seguridad"],
  },

  comunicacion: {
    icon: "coms",
    color: "#EC407A",
    keywords: ["comunicación"],
  },

  educacion: {
    icon: "school",
    color: "#00838F",
    keywords: ["educacion"],
  },

  iglesias: {
    icon: "church",
    color: "#F57C00",
    keywords: ["religiosos"],
  },

  salud: {
    icon: "salud",
    color: "#D84315",
    keywords: ["salud"],
  },

  buildings: {
    icon: "house",
    color: "#6D4C41",
    keywords: [
      "edif",
      "edificio",
      "construccion",
      "construcciones",
      "turisticas",
      "seguridad",
      "otras_edificaciones",
    ],
  },

  airports: {
    icon: "plane",
    color: "#3949AB",
    keywords: ["aeroportuaria"],
  },

  ports: {
    icon: "boat",
    color: "#1565C0",
    keywords: ["portuaria", "portuarias", "obra_portuaria"],
  },

  roads: {
    icon: "train",
    color: "#4E342E",
    keywords: ["red_vial", "vias_secundarias", "vial"],
  },

  hydrology: {
    icon: "hidro",
    color: "#29B6F6",
    keywords: ["hid", "curso_agua", "espejo", "hidro"],
  },

  vegetation_tree: {
    color: "#795548",
    keywords: ["arborea"],
  },

  vegetation_bush: {
    color: "#558B2F",
    keywords: ["arbustiva"],
  },

  vegetation_crop: {
    color: "#9E9D24",
    keywords: ["cultivos"],
  },

  vegetation_wetland: {
    color: "#26A69A",
    keywords: ["hidrofila"],
  },

  vegetation_bare: {
    color: "#A1887F",
    keywords: ["suelo_desnudo"],
  },

  political: {
    color: "#C62828",
    keywords: ["limite", "provincias", "pais"],
  },

  topo: {
    color: "#8D6E63",
    keywords: ["curvas_nivel", "alturas_topograficas"],
  },

  agro: {
    icon: "farm",
    color: "#7CB342",
    keywords: ["agropec", "agro"],
  },

  unknown: {
    icon: "dunno",
    color: "#9E9E9E",
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

export function getLayerStyle(layerName, geometryType) {
  const type = geometryType.toLowerCase();
  const category = classifyLayer(layerName);

  const cfg = CATEGORIES[category] || CATEGORIES.unknown;

  if (type.includes("point")) {
    return new Style({
      image: new Icon({
        src: ICON_CACHE[cfg.icon],
        anchor: [0.5, 1],
        scale: 1,
      }),
    });
  }

  if (type.includes("line")) {
    return new Style({
      stroke: new Stroke({ color: cfg.color, width: 2 }),
    });
  }

  return new Style({
    fill: new Fill({ color: cfg.color }),
    stroke: new Stroke({ color: "#000", width: 1 }),
  });
}
