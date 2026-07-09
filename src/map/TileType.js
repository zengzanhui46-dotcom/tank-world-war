import { TILE_TYPES } from '../config.js';

export const TileProperties = {
  [TILE_TYPES.EMPTY]: {
    name: 'empty',
    texture: 'tile_empty',
    walkable: true,
    bulletPass: true,
    destructible: false,
    slippery: false,
  },
  [TILE_TYPES.BRICK]: {
    name: 'brick',
    texture: 'tile_brick',
    walkable: false,
    bulletPass: false,
    destructible: true,
    slippery: false,
  },
  [TILE_TYPES.STEEL]: {
    name: 'steel',
    texture: 'tile_steel',
    walkable: false,
    bulletPass: false,
    destructible: false,
    slippery: false,
  },
  [TILE_TYPES.WATER]: {
    name: 'water',
    texture: 'tile_water',
    walkable: false,
    bulletPass: true,
    destructible: false,
    slippery: false,
  },
  [TILE_TYPES.GRASS]: {
    name: 'grass',
    texture: 'tile_grass',
    walkable: true,
    bulletPass: true,
    destructible: false,
    slippery: false,
  },
  [TILE_TYPES.ICE]: {
    name: 'ice',
    texture: 'tile_ice',
    walkable: true,
    bulletPass: true,
    destructible: false,
    slippery: true,
  },
};
