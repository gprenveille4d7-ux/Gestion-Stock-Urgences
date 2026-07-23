import type { EmergencyCart, EmergencyCartDrawer, EmergencyCartItem } from "./types";

const ASSET_ROOT = "/assets/chariots/box-3-4-adulte";
const ITEM_ROOT = `${ASSET_ROOT}/tiroir-01/items`;
const LOCATION = "Tiroir 1 · Intubation";

type PositionedItemInput = {
  id: string;
  name: string;
  specification?: string;
  category: string;
  file: string;
  x: number;
  y: number;
  width: number;
  aspectRatio: number;
  zIndex: number;
};

function positionedItem({
  id,
  name,
  specification,
  category,
  file,
  x,
  y,
  width,
  aspectRatio,
  zIndex,
}: PositionedItemInput): EmergencyCartItem {
  return {
    id,
    name,
    specification,
    category,
    location: LOCATION,
    asset: `${ITEM_ROOT}/${file}`,
    position: {
      x,
      y,
      width,
      height: Number((width * aspectRatio).toFixed(2)),
      rotation: 0,
      zIndex,
    },
  };
}

const intubationItems: EmergencyCartItem[] = [
  positionedItem({ id: "sonde-intubation-6-5", name: "Sonde d’intubation", specification: "6,5", category: "Intubation", file: "sonde-intubation-6-5.png", x: 13.6, y: 35.5, width: 46.7, aspectRatio: 0.284, zIndex: 20 }),
  positionedItem({ id: "sonde-intubation-7", name: "Sonde d’intubation", specification: "7", category: "Intubation", file: "sonde-intubation-7.png", x: 13.6, y: 44.3, width: 48.6, aspectRatio: 0.284, zIndex: 21 }),
  positionedItem({ id: "sonde-intubation-7-5", name: "Sonde d’intubation", specification: "7,5", category: "Intubation", file: "sonde-intubation-7-5.png", x: 13.6, y: 53, width: 50.6, aspectRatio: 0.284, zIndex: 22 }),
  positionedItem({ id: "lame-laryngoscope-2", name: "Lame de laryngoscope", specification: "Taille 2", category: "Intubation", file: "lame-laryngoscope-2.png", x: 14, y: 25.1, width: 19.1, aspectRatio: 0.441, zIndex: 10 }),
  positionedItem({ id: "lame-laryngoscope-3", name: "Lame de laryngoscope", specification: "Taille 3", category: "Intubation", file: "lame-laryngoscope-3.png", x: 35.1, y: 24.7, width: 20.3, aspectRatio: 0.441, zIndex: 11 }),
  positionedItem({ id: "lame-laryngoscope-4", name: "Lame de laryngoscope", specification: "Taille 4", category: "Intubation", file: "lame-laryngoscope-4.png", x: 57, y: 24.3, width: 21.5, aspectRatio: 0.441, zIndex: 12 }),
  positionedItem({ id: "mandrin-intubation", name: "Mandrin", category: "Intubation", file: "mandrin-intubation.png", x: 14, y: 18.3, width: 37.5, aspectRatio: 0.268, zIndex: 8 }),
  positionedItem({ id: "mandrin-eschmann", name: "Mandrin d’Eschmann", category: "Intubation", file: "mandrin-eschmann.png", x: 16.7, y: 11.6, width: 63.8, aspectRatio: 0.095, zIndex: 7 }),
  positionedItem({ id: "canule-petite", name: "Canule de Guedel", specification: "Petite taille", category: "Libération des voies aériennes", file: "canule-oropharyngee-petite.png", x: 65.4, y: 35.9, width: 17.5, aspectRatio: 0.477, zIndex: 30 }),
  positionedItem({ id: "canule-moyenne", name: "Canule de Guedel", specification: "Taille moyenne", category: "Libération des voies aériennes", file: "canule-oropharyngee-moyenne.png", x: 64.6, y: 45.1, width: 18.7, aspectRatio: 0.477, zIndex: 31 }),
  positionedItem({ id: "canule-grande", name: "Canule de Guedel", specification: "Grande taille", category: "Libération des voies aériennes", file: "canule-oropharyngee-grande.png", x: 63.8, y: 54.6, width: 19.9, aspectRatio: 0.477, zIndex: 32 }),
  positionedItem({ id: "lacet-fixation-sonde", name: "Lacet de fixation de la sonde", category: "Fixation", file: "lacet-fixation.png", x: 63.4, y: 14.4, width: 21.5, aspectRatio: 0.759, zIndex: 9 }),
  positionedItem({ id: "pince-magill", name: "Pince de Magill", category: "Intubation", file: "pince-magill.png", x: 63, y: 63, width: 21.5, aspectRatio: 0.425, zIndex: 40 }),
  positionedItem({ id: "ventoline", name: "Ventoline", category: "Médicament", file: "ventoline.png", x: 15.6, y: 68.6, width: 7.2, aspectRatio: 0.935, zIndex: 50 }),
  positionedItem({ id: "leukoplast", name: "Leukoplast", category: "Fixation", file: "leukoplast.png", x: 24.3, y: 69.2, width: 6.8, aspectRatio: 1.037, zIndex: 51 }),
  positionedItem({ id: "seringue-omnifix-60-ml", name: "Seringue Omnifix", specification: "60 mL", category: "Consommable", file: "seringue-omnifix-60ml.png", x: 33.1, y: 69.8, width: 18.7, aspectRatio: 0.279, zIndex: 52 }),
  positionedItem({ id: "filtre-respiratoire", name: "Filtre respiratoire", category: "Ventilation", file: "filtre-respiratoire.png", x: 53.8, y: 68.4, width: 8.8, aspectRatio: 0.489, zIndex: 53 }),
  positionedItem({ id: "raccord-cannele", name: "Raccord cannelé", category: "Ventilation", file: "raccord-cannele.png", x: 63.8, y: 73.4, width: 11.2, aspectRatio: 0.294, zIndex: 54 }),
  positionedItem({ id: "lidocaine-spray-canule-longue", name: "Lidocaïne spray avec canule longue", category: "Médicament", file: "lidocaine-spray-canule.png", x: 80.9, y: 66.6, width: 5.2, aspectRatio: 2.383, zIndex: 55 }),
];

function drawer02Item(
  id: string,
  name: string,
  specification: string,
  file: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
): EmergencyCartItem {
  const scale = 100 / 1254;
  return {
    id,
    name,
    specification: specification || undefined,
    category: "Médicaments et injection",
    location: "Tiroir 2 · Médicaments et injection",
    asset: `${ASSET_ROOT}/tiroir-02/items/${file}`,
    position: {
      x: Number((x * scale).toFixed(3)),
      y: Number((y * scale).toFixed(3)),
      width: Number((width * scale).toFixed(3)),
      height: Number((height * scale).toFixed(3)),
      rotation: 0,
      zIndex,
    },
  };
}

const medicationItems: EmergencyCartItem[] = [
  drawer02Item("adrenaline-1mg", "Adrénaline", "1 mg", "adrenaline-1mg.png", 213, 910, 155, 32, 10),
  drawer02Item("adrenaline-5mg", "Adrénaline", "5 mg", "adrenaline-5mg.png", 213, 790, 155, 32, 11),
  drawer02Item("atropine", "Atropine", "", "atropine.png", 213, 669, 155, 32, 12),
  drawer02Item("cordarone-150mg", "Cordarone", "150 mg", "cordarone-150mg.png", 213, 549, 155, 32, 13),
  drawer02Item("rivotril", "Rivotril", "", "rivotril.png", 213, 428, 155, 32, 14),
  drawer02Item("valium-10mg", "Valium", "10 mg", "valium-10mg.png", 213, 308, 155, 33, 15),
  drawer02Item("lasilix-20mg", "Lasilix", "20 mg", "lasilix-20mg.png", 213, 187, 155, 33, 16),
  drawer02Item("isuprel", "Isuprel", "", "isuprel.png", 434, 910, 155, 32, 10),
  drawer02Item("solumedrol-40mg", "Solu-Médrol", "40 mg", "solumedrol-40mg.png", 457, 790, 109, 43, 11),
  drawer02Item("solumedrol-120mg", "Solu-Médrol", "120 mg", "solumedrol-120mg.png", 457, 669, 109, 43, 12),
  drawer02Item("noradrenaline-8mg", "Noradrénaline", "8 mg", "noradrenaline-8mg.png", 434, 549, 155, 32, 13),
  drawer02Item("sulfate-magnesium", "Sulfate de magnésium", "", "sulfate-magnesium.png", 434, 428, 155, 31, 14),
  drawer02Item("midazolam-50mg", "Midazolam", "50 mg", "midazolam-50mg.png", 434, 308, 155, 32, 15),
  drawer02Item("g30", "G30 %", "", "g30.png", 434, 187, 155, 31, 16),
  drawer02Item("risordan-10mg", "Risordan", "10 mg", "risordan-10mg.png", 655, 910, 155, 32, 10),
  drawer02Item("naloxone", "Naloxone", "", "naloxone.png", 655, 790, 155, 32, 11),
  drawer02Item("natispray", "Natispray", "", "natispray.png", 701, 669, 63, 68, 12),
  drawer02Item("flumazenil", "Flumazénil", "", "flumazenil.png", 655, 549, 155, 32, 13),
  drawer02Item("eppi-20ml", "EPPi", "20 mL", "eppi-20ml.png", 655, 428, 155, 31, 14),
  drawer02Item("sufenta-250ug", "Sufenta", "250 µg", "sufenta-250ug.png", 655, 308, 155, 32, 15),
  drawer02Item("propofol-200mg", "Propofol", "200 mg", "propofol-200mg.png", 655, 187, 155, 32, 16),
  drawer02Item("etomidate", "Étomidate", "", "etomidate.png", 876, 820, 155, 32, 10),
  drawer02Item("aiguille-rose", "Aiguille rose", "", "aiguille-rose.png", 876, 609, 155, 41, 11),
  drawer02Item("seringue-5ml", "Seringue", "5 mL", "seringue-5ml.png", 886, 398, 136, 43, 12),
  drawer02Item("seringue-10ml", "Seringue", "10 mL", "seringue-10ml.png", 886, 187, 136, 43, 13),
];

const drawerHitAreas = [
  { x: 26.5, y: 18, width: 47, height: 6.5 },
  { x: 26.5, y: 24.7, width: 47, height: 6.3 },
  { x: 26.5, y: 31.3, width: 47, height: 10.2 },
  { x: 26.5, y: 41.8, width: 47, height: 13.1 },
  { x: 26.5, y: 55.3, width: 47, height: 19.5 },
];

const drawers: EmergencyCartDrawer[] = drawerHitAreas.map((hitArea, index) => {
  const drawerNumber = index + 1;
  const drawerConfig = drawerNumber === 1
    ? {
        label: "Tiroir 1 · Intubation",
        category: "Intubation",
        topAsset: `${ASSET_ROOT}/tiroir-01-intubation-vide-gabarit.png`,
        previewAsset: `${ASSET_ROOT}/tiroir-01-intubation-compose.png`,
        items: intubationItems,
      }
    : drawerNumber === 2
      ? {
          label: "Tiroir 2 · Médicaments et injection",
          category: "Médicaments et injection",
          topAsset: `${ASSET_ROOT}/tiroir-02-medicaments-vide-gabarit.png`,
          previewAsset: `${ASSET_ROOT}/tiroir-02-medicaments-compose.png`,
          items: medicationItems,
        }
      : null;
  const available = Boolean(drawerConfig);
  return {
    id: `tiroir-${String(drawerNumber).padStart(2, "0")}`,
    label: drawerConfig?.label || `Tiroir ${drawerNumber}`,
    category: drawerConfig?.category || "Contenu à documenter",
    topAsset: drawerConfig?.topAsset,
    previewAsset: drawerConfig?.previewAsset,
    hitArea,
    items: drawerConfig?.items || [],
    available,
  };
});

export const emergencyCarts: Record<3 | 4, EmergencyCart> = {
  3: {
    id: "chariot-adulte-box-3",
    box: 3,
    label: "Chariot d’urgences adulte · Box 3",
    frontAsset: `${ASSET_ROOT}/chariot-face.png`,
    drawers,
  },
  4: {
    id: "chariot-adulte-box-4",
    box: 4,
    label: "Chariot d’urgences adulte · Box 4",
    frontAsset: `${ASSET_ROOT}/chariot-face.png`,
    drawers,
  },
};
