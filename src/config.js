// Game constants and configuration
export const TILE_SIZE = 32;
export const MAP_COLS = 26;
export const MAP_ROWS = 20;
export const GAME_WIDTH = MAP_COLS * TILE_SIZE;   // 832
export const GAME_HEIGHT = MAP_ROWS * TILE_SIZE;  // 640

export const TILE_TYPES = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  WATER: 3,
  GRASS: 4,
  ICE: 5,
};

export const DIRECTIONS = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
};

export const TANK_TYPES = {
  PLAYER: {
    key: 'player',
    speed: 150,
    hp: 3,
    fireRate: 500,
    bulletSpeed: 300,
    color: 0x4caf50,
  },
  BASIC: {
    key: 'basic',
    speed: 80,
    hp: 1,
    fireRate: 1200,
    bulletSpeed: 200,
    color: 0x9e9e9e,
  },
  FAST: {
    key: 'fast',
    speed: 160,
    hp: 1,
    fireRate: 900,
    bulletSpeed: 250,
    color: 0xf44336,
  },
  HEAVY: {
    key: 'heavy',
    speed: 60,
    hp: 3,
    fireRate: 1000,
    bulletSpeed: 200,
    color: 0x424242,
  },
  ELITE: {
    key: 'elite',
    speed: 130,
    hp: 2,
    fireRate: 600,
    bulletSpeed: 300,
    color: 0xffd700,
  },
};

export const POWERUP_TYPES = {
  HEALTH: {
    key: 'health',
    label: '生命',
    color: 0xff4444,
    symbol: '+',
    duration: 0,
  },
  SPEED: {
    key: 'speed',
    label: '加速',
    color: 0xffeb3b,
    symbol: '⚡',
    duration: 15000,
  },
  SHIELD: {
    key: 'shield',
    label: '护盾',
    color: 0x42a5f5,
    symbol: '🛡',
    duration: 10000,
  },
  RAPID_FIRE: {
    key: 'rapid_fire',
    label: '连发',
    color: 0xff9800,
    symbol: '🔫',
    duration: 15000,
  },
  POWER_SHOT: {
    key: 'power_shot',
    label: '穿甲',
    color: 0xffd700,
    symbol: '★',
    duration: 12000,
  },
};

export const PLAYER_LIVES = 3;
export const POWERUP_SPAWN_MIN = 15000;
export const POWERUP_SPAWN_MAX = 20000;
export const POWERUP_MAX_ON_MAP = 2;
export const POWERUP_LIFETIME = 25000;
export const ENEMY_SPAWN_DELAY = 3000;
export const MAX_ENEMIES_ON_SCREEN = 6;
