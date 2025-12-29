import { BiomeType } from '../types';

// Tabela Base de Pontos (Fases 1 a 10)
// Fase 11 é Boss e não usa essa tabela.
export const BASE_LEVEL_SCORES = [
  30,   // Fase 1
  70,   // Fase 2
  120,  // Fase 3
  180,  // Fase 4
  250,  // Fase 5
  330,  // Fase 6
  420,  // Fase 7
  520,  // Fase 8
  630,  // Fase 9
  750   // Fase 10
];

// Multiplicadores por Área
export const BIOME_MULTIPLIERS: Record<BiomeType, number> = {
  GARDEN: 1.0,
  CITY: 1.4,
  SEWER: 1.9,
  HOUSE: 2.5,
  CEMETERY: 3.2,
  FACTORY: 4.0,
  ASTRAL: 5.0
};

export const BIOME_CONFIG: Record<BiomeType, { 
  name: { pt: string; en: string }; 
  bg: string; 
  accent: string; 
  monsters: string[]; 
}> = {
  GARDEN: {
    name: { pt: "Jardim Abandonado", en: "Abandoned Garden" },
    bg: "#0f1c15", // Dark Green
    accent: "#4ade80",
    monsters: ['flower', 'bug', 'leaf']
  },
  CITY: {
    name: { pt: "Cidade Noturna", en: "Night City" },
    bg: "#0f172a", // Dark Blue
    accent: "#60a5fa",
    monsters: ['car', 'building', 'lamp']
  },
  SEWER: {
    name: { pt: "Esgoto", en: "Sewer" },
    bg: "#1c1917", // Dark Brown/Olive
    accent: "#a3e635",
    monsters: ['rat', 'biohazard', 'skull']
  },
  HOUSE: {
    name: { pt: "Casa Assombrada", en: "Haunted House" },
    bg: "#1e1b4b", // Deep Purple
    accent: "#c084fc",
    monsters: ['ghost', 'bed', 'book']
  },
  CEMETERY: {
    name: { pt: "Cemitério", en: "Cemetery" },
    bg: "#18181b", // Zinc/Grey
    accent: "#e4e4e7",
    monsters: ['skull', 'cross', 'bone']
  },
  FACTORY: {
    name: { pt: "Fábrica", en: "Factory" },
    bg: "#280808", // Dark Red
    accent: "#f87171",
    monsters: ['gear', 'robot', 'fire']
  },
  ASTRAL: {
    name: { pt: "Plano Astral", en: "Astral Plane" },
    bg: "#2e1065", // Dark Violet
    accent: "#f472b6",
    monsters: ['star', 'eye', 'void']
  }
};

export const BIOME_ORDER: BiomeType[] = [
  'GARDEN', 'CITY', 'SEWER', 'HOUSE', 'CEMETERY', 'FACTORY', 'ASTRAL'
];

export const getTargetScore = (biome: BiomeType, level: number): number => {
    // Boss level (11) doesn't rely on target score logic here, but for safety return 0 or high
    if (level >= 11) return 0; 
    
    // Level index 0-9 for Fases 1-10
    const baseScore = BASE_LEVEL_SCORES[level - 1] || 1000;
    const multiplier = BIOME_MULTIPLIERS[biome] || 1.0;
    
    return Math.floor(baseScore * multiplier);
};