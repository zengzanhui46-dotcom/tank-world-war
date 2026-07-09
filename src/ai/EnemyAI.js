import Phaser from 'phaser';
import { DIRECTIONS, TILE_SIZE, MAP_COLS, MAP_ROWS } from '../config.js';

export default class EnemyAI {
  constructor(enemyTank, tileMap, playerTank, base) {
    this.tank = enemyTank;
    this.tileMap = tileMap;
    this.playerTank = playerTank;
    this.base = base;
    this.moveTimer = 0;
    this.moveDirection = null;
    this.changeDirectionInterval = Phaser.Math.Between(800, 2000);

    // AI personality based on tank type
    const type = enemyTank.tankTypeKey;
    switch (type) {
      case 'basic':
        this.aggressiveness = 0.3;   // Primarily move toward base
        this.shootAtPlayerChance = 0.1;
        this.randomMoveChance = 0.4;
        break;
      case 'fast':
        this.aggressiveness = 0.5;
        this.shootAtPlayerChance = 0.2;
        this.randomMoveChance = 0.3;
        this.preferFlanking = true;
        break;
      case 'heavy':
        this.aggressiveness = 0.8;   // Rush toward base
        this.shootAtPlayerChance = 0.05;
        this.randomMoveChance = 0.1;
        break;
      case 'elite':
        this.aggressiveness = 0.6;
        this.shootAtPlayerChance = 0.4;
        this.randomMoveChance = 0.15;
        this.smart = true;           // Better pathfinding
        break;
      default:
        this.aggressiveness = 0.4;
        this.shootAtPlayerChance = 0.15;
        this.randomMoveChance = 0.3;
    }

    // Direction weights for base-seeking
    this.directionWeights = [0, 0, 0, 0]; // UP, RIGHT, DOWN, LEFT
  }

  update(delta) {
    this.moveTimer += delta;

    if (this.moveTimer >= this.changeDirectionInterval) {
      this.moveTimer = 0;
      this.changeDirectionInterval = Phaser.Math.Between(600, 2000);
      this.decideDirection();
    }

    // Always consider shooting
    const bullet = this.decideShoot();

    return {
      direction: this.moveDirection,
      bullet,
    };
  }

  decideDirection() {
    const tx = this.tank.x;
    const ty = this.tank.y;

    // Calculate direction to base
    const baseAngle = Phaser.Math.Angle.Between(tx, ty, this.base.x, this.base.y);
    const baseDir = this.angleToDirection(baseAngle);

    // Calculate direction to player
    let playerDir = null;
    let distToPlayer = Infinity;
    if (this.playerTank && this.playerTank.active) {
      distToPlayer = Phaser.Math.Distance.Between(tx, ty, this.playerTank.x, this.playerTank.y);
      const playerAngle = Phaser.Math.Angle.Between(tx, ty, this.playerTank.x, this.playerTank.y);
      playerDir = this.angleToDirection(playerAngle);
    }

    // Decide target
    const rnd = Math.random();
    let targetDir;

    if (rnd < this.randomMoveChance && !this.preferFlanking) {
      // Random movement
      targetDir = Phaser.Math.Between(0, 3);
    } else if (this.preferFlanking && distToPlayer < 200 && playerDir !== null) {
      // Flanking: move perpendicular to player direction for side attack
      targetDir = (playerDir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    } else if (rnd < this.aggressiveness || !this.playerTank || !this.playerTank.active) {
      targetDir = baseDir;
    } else {
      targetDir = playerDir || baseDir;
    }

    // Check if the chosen direction is blocked
    if (!this.isDirectionClear(targetDir)) {
      // Try alternatives
      const alternatives = this.getAlternativeDirections(targetDir);
      let found = false;
      for (const alt of alternatives) {
        if (this.isDirectionClear(alt)) {
          targetDir = alt;
          found = true;
          break;
        }
      }
      // If all blocked, pick a random direction anyway (tank will bounce off walls)
      if (!found) {
        targetDir = alternatives[0];
      }
    }

    // Smart AI: avoid dead ends
    if (this.smart) {
      targetDir = this.avoidDeadEnds(targetDir);
    }

    this.moveDirection = targetDir;
  }

  angleToDirection(angle) {
    // Normalize to [-PI, PI]
    if (angle > Math.PI) angle -= 2 * Math.PI;
    if (angle < -Math.PI) angle += 2 * Math.PI;

    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return DIRECTIONS.RIGHT;
    if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) return DIRECTIONS.DOWN;
    if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) return DIRECTIONS.UP;
    return DIRECTIONS.LEFT;
  }

  isDirectionClear(direction) {
    const testDist = TILE_SIZE;
    let testX = this.tank.x;
    let testY = this.tank.y;

    switch (direction) {
      case DIRECTIONS.UP: testY -= testDist; break;
      case DIRECTIONS.DOWN: testY += testDist; break;
      case DIRECTIONS.LEFT: testX -= testDist; break;
      case DIRECTIONS.RIGHT: testX += testDist; break;
    }

    const col = Math.floor(testX / TILE_SIZE);
    const row = Math.floor(testY / TILE_SIZE);

    // Boundary check
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;

    // Check tile
    const tiles = this.tileMap;
    return tiles.isWalkable(col, row);
  }

  getAlternativeDirections(preferred) {
    // Return preferred first, then others in order of proximity
    const all = [DIRECTIONS.UP, DIRECTIONS.RIGHT, DIRECTIONS.DOWN, DIRECTIONS.LEFT];
    const result = [preferred];
    for (const d of all) {
      if (!result.includes(d)) result.push(d);
    }
    return result;
  }

  avoidDeadEnds(direction) {
    // Count open directions from next tile
    const testDist = TILE_SIZE;
    let testX = this.tank.x;
    let testY = this.tank.y;

    switch (direction) {
      case DIRECTIONS.UP: testY -= testDist; break;
      case DIRECTIONS.DOWN: testY += testDist; break;
      case DIRECTIONS.LEFT: testX -= testDist; break;
      case DIRECTIONS.RIGHT: testX += testDist; break;
    }

    let openCount = 0;
    const checks = [
      { dx: 0, dy: -testDist },
      { dx: 0, dy: testDist },
      { dx: -testDist, dy: 0 },
      { dx: testDist, dy: 0 },
    ];

    for (const check of checks) {
      const col = Math.floor((testX + check.dx) / TILE_SIZE);
      const row = Math.floor((testY + check.dy) / TILE_SIZE);
      if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
        if (this.tileMap.isWalkable(col, row)) {
          openCount++;
        }
      }
    }

    // If next tile leads to a dead end (< 2 open paths), try alternate direction
    if (openCount < 2) {
      const alternatives = this.getAlternativeDirections(direction);
      for (const alt of alternatives) {
        let altX = this.tank.x;
        let altY = this.tank.y;
        switch (alt) {
          case DIRECTIONS.UP: altY -= testDist; break;
          case DIRECTIONS.DOWN: altY += testDist; break;
          case DIRECTIONS.LEFT: altX -= testDist; break;
          case DIRECTIONS.RIGHT: altX += testDist; break;
        }
        let altOpen = 0;
        for (const check of checks) {
          const col = Math.floor((altX + check.dx) / TILE_SIZE);
          const row = Math.floor((altY + check.dy) / TILE_SIZE);
          if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
            if (this.tileMap.isWalkable(col, row)) altOpen++;
          }
        }
        if (altOpen >= 2) {
          return alt;
        }
      }
    }
    return direction;
  }

  decideShoot() {
    if (!this.tank) return false;

    const now = this.scene ? this.scene.time.now : 0;
    if (!this._lastShotCheck) this._lastShotCheck = now;

    const fireRate = this.tank.activePowerUps['rapid_fire']
      ? this.tank.fireRate / 2
      : this.tank.fireRate;

    if (now - (this._lastShot || 0) < fireRate) return false;
    this._lastShot = now;

    // Check line of sight to base
    if (this.hasLineOfSight(this.base.x, this.base.y)) {
      // Aim at base
      const angle = Phaser.Math.Angle.Between(this.tank.x, this.tank.y, this.base.x, this.base.y);
      this.tank.direction = this.angleToDirection(angle);
      return true;
    }

    // Check line of sight to player (if aggressive enough)
    if (this.playerTank && this.playerTank.active && Math.random() < this.shootAtPlayerChance) {
      if (this.hasLineOfSight(this.playerTank.x, this.playerTank.y)) {
        const angle = Phaser.Math.Angle.Between(this.tank.x, this.tank.y, this.playerTank.x, this.playerTank.y);
        this.tank.direction = this.angleToDirection(angle);
        return true;
      }
    }

    // Randomly shoot in movement direction
    if (Math.random() < 0.3) {
      return true; // Shoot in current direction
    }

    return false;
  }

  hasLineOfSight(targetX, targetY) {
    const tx = this.tank.x;
    const ty = this.tank.y;
    const dist = Phaser.Math.Distance.Between(tx, ty, targetX, targetY);
    const steps = Math.floor(dist / (TILE_SIZE / 2));
    const dx = (targetX - tx) / steps;
    const dy = (targetY - ty) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = tx + dx * i;
      const checkY = ty + dy * i;
      const col = Math.floor(checkX / TILE_SIZE);
      const row = Math.floor(checkY / TILE_SIZE);

      if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) continue;

      const props = this.tileMap.getTilePropertiesAt(col, row);
      if (props && !props.bulletPass) {
        return false;
      }
    }
    return true;
  }
}
