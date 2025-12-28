import { BiomeType } from '../types';

export const LEVEL_SCORES = [
  30, 70, 120, 180, 250, 330, 420, 520, 630, 750
];

export const BIOME_CONFIG: Record<BiomeType, { 
  name: { pt: string; en: string }; 
  bg: string; 
  accent: string; 
  monsters: string[]; // Lucid icon names mostly
}> = {
  GARDEN: {
    name: { pt: "Jardim Abandonado", en: "Abandoned Garden" },
    bg: "#0f1c15", // Dark Green
    accent: "#4ade80",
    monsters: ['flower', 'bug', 'leaf', 'sprout', 'snail', 'bird']
  },
  CITY: {
    name: { pt: "Cidade Noturna", en: "Night City" },
    bg: "#0f172a", // Dark Blue
    accent: "#60a5fa",
    monsters: ['car', 'building', 'lamp', 'rat', 'trash', 'ghost']
  },
  SEWER: {
    name: { pt: "Esgoto", en: "Sewer" },
    bg: "#1c1917", // Dark Brown/Olive
    accent: "#a3e635",
    monsters: ['rat', 'droplet', 'skull', 'biohazard', 'fish', 'bug']
  },
  HOUSE: {
    name: { pt: "Casa Assombrada", en: "Haunted House" },
    bg: "#1e1b4b", // Deep Purple
    accent: "#c084fc",
    monsters: ['ghost', 'bed', 'lamp', 'book', 'spider', 'web']
  },
  CEMETERY: {
    name: { pt: "Cemitério", en: "Cemetery" },
    bg: "#18181b", // Zinc/Grey
    accent: "#e4e4e7",
    monsters: ['skull', 'cross', 'ghost', 'hand', 'bone', 'tomb']
  },
  FACTORY: {
    name: { pt: "Fábrica", en: "Factory" },
    bg: "#280808", // Dark Red
    accent: "#f87171",
    monsters: ['gear', 'hammer', 'robot', 'bolt', 'fire', 'smoke']
  },
  DESERT: {
    name: { pt: "Deserto", en: "Desert" },
    bg: "#291805", // Dark Orange/Brown
    accent: "#fbbf24",
    monsters: ['sun', 'cactus', 'scorpion', 'snake', 'skull', 'wind']
  }
};

export const BIOME_ORDER: BiomeType[] = [
  'GARDEN', 'CITY', 'SEWER', 'HOUSE', 'CEMETERY', 'FACTORY', 'DESERT'
];

export const getTargetScore = (level: number, globalProgressMultiplier: number) => {
    if (level > 10) return 0; // Boss level
    const base = LEVEL_SCORES[level - 1] || 1000;
    return Math.floor(base * globalProgressMultiplier);
};