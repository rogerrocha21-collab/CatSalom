export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER'
}

export type Language = 'pt' | 'en';

export enum SpellType {
  HORIZONTAL = 'HORIZONTAL', // —
  VERTICAL = 'VERTICAL',     // |
  CARET = 'CARET',           // ^
  LIGHTNING = 'LIGHTNING',   // Z
  V_SHAPE = 'V_SHAPE',       // v
  CIRCLE = 'CIRCLE',         // O
  TRIANGLE = 'TRIANGLE'      // Δ
}

export type BiomeType = 
  | 'GARDEN' 
  | 'CITY' 
  | 'SEWER' 
  | 'HOUSE' 
  | 'CEMETERY' 
  | 'FACTORY' 
  | 'DESERT';

export interface Enemy {
  id: string;
  x: number;
  y: number;
  speed: number;
  symbol: SpellType;
  color: string;
  radius: number;
  spawnTime: number;
  isBossSigil?: boolean; // If true, it's a weak point on the boss
  isProjectile?: boolean; // If true, it's an attack from the boss
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  glow?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface SkillState {
  id: 'shield' | 'hourglass' | 'bomb';
  isUnlocked: boolean;
  isOnCooldown: boolean;
  cooldownTime: number; // in ms
  lastUsed: number;
}