import { POWERUP_TYPES } from '../config.js';

export function getRandomPowerUpType(allowedTypes) {
  const types = allowedTypes
    .map(key => POWERUP_TYPES[key.toUpperCase().replace(/ /g, '_')] || POWERUP_TYPES[key])
    .filter(Boolean);

  // Default to all types if none specified
  const pool = types.length > 0 ? types : Object.values(POWERUP_TYPES);

  // Weighted random
  const weights = pool.map(t => t.key === 'health' ? 3 : 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * totalWeight;

  for (let i = 0; i < pool.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return pool[i];
  }

  return pool[0];
}

export { POWERUP_TYPES };
