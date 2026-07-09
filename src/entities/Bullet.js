import Phaser from 'phaser';
import { TILE_SIZE, DIRECTIONS, TILE_TYPES } from '../config.js';

/**
 * Simple bullet with manual movement — avoids Phaser arcade physics issues.
 */
export default class Bullet extends Phaser.GameObjects.Image {
  constructor(scene, x, y, texture, direction, speed, canDestroyBrick = true, isPowerShot = false) {
    super(scene, x, y, texture);
    scene.add.existing(this);

    this.direction = direction;
    this.speed = speed;
    this.canDestroyBrick = canDestroyBrick;
    this.isPowerShot = isPowerShot;
    this.owner = null;
    this.alive = true;

    this.setDepth(3);
  }

  update(time, delta) {
    if (!this.alive) return;

    const dt = delta / 1000; // seconds
    const move = this.speed * dt;

    switch (this.direction) {
      case DIRECTIONS.UP: this.y -= move; break;
      case DIRECTIONS.DOWN: this.y += move; break;
      case DIRECTIONS.LEFT: this.x -= move; break;
      case DIRECTIONS.RIGHT: this.x += move; break;
    }

    // Out of bounds check
    if (this.x < -10 || this.x > 850 || this.y < -10 || this.y > 660) {
      this.kill();
    }
  }

  checkTileCollision(tileMap) {
    if (!this.alive) return false;

    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);

    if (col < 0 || col >= 26 || row < 0 || row >= 20) {
      this.kill();
      return true;
    }

    const tileType = tileMap.getTileAt(col, row);
    if (tileType === TILE_TYPES.BRICK) {
      if (this.canDestroyBrick || this.isPowerShot) {
        tileMap.destroyTileAt(col, row);
      }
      this.kill();
      return true;
    }
    if (tileType === TILE_TYPES.STEEL) {
      if (this.isPowerShot) {
        tileMap.destroyTileAt(col, row);
      }
      this.kill();
      return true;
    }
    // WATER, GRASS, ICE, EMPTY are passable
    return false;
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.destroy();
  }
}
