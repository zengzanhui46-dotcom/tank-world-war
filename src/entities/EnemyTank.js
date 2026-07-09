import Tank from './Tank.js';
import EnemyAI from '../ai/EnemyAI.js';
import { TILE_SIZE, DIRECTIONS } from '../config.js';

export default class EnemyTank extends Tank {
  constructor(scene, x, y, tankConfig) {
    super(scene, x, y, tankConfig);
    this.ai = null;
    this.destroyed = false;
  }

  setupAI(tileMap, playerTank, base) {
    this.ai = new EnemyAI(this, tileMap, playerTank, base);
    this.ai.scene = this.scene;
  }

  updateAI(delta) {
    if (!this.ai || this.destroyed || !this.active) return null;

    const { direction, bullet } = this.ai.update(delta);

    if (direction !== null) {
      this.move(direction);

      // Check collision
      if (this.scene && this.scene.tileMap) {
        const collisions = this.scene.tileMap.checkCollision(
          this.x, this.y, this.body.width, this.body.height
        );
        if ((direction === DIRECTIONS.UP && collisions.up) ||
            (direction === DIRECTIONS.DOWN && collisions.down) ||
            (direction === DIRECTIONS.LEFT && collisions.left) ||
            (direction === DIRECTIONS.RIGHT && collisions.right)) {
          this.stop();
          // Force AI to reconsider
          this.ai.moveTimer = 9999;
        }
      }
    } else {
      this.stop();
    }

    if (bullet) {
      return this.shoot();
    }

    return null;
  }

  pickupPowerUp(powerUp) {
    this.applyPowerUp(powerUp);
  }

  destroy(fromScene) {
    this.destroyed = true;
    super.destroy(fromScene);
  }
}
