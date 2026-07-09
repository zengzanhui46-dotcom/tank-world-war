import Phaser from 'phaser';
import { TILE_SIZE, DIRECTIONS, TANK_TYPES } from '../config.js';

/**
 * Visual-only tank for displaying remote players in multiplayer.
 * No AI, no collision — just renders at the position sent by the server.
 */
export default class RemoteTank extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, playerData) {
    super(scene, x, y, 'tank_player_up');
    scene.add.existing(this);

    this.playerId = playerData.id;
    this.playerName = playerData.name;
    this.direction = DIRECTIONS.UP;
    this.targetX = x;
    this.targetY = y;
    this.setDepth(4);

    // Name label
    this.nameLabel = scene.add.text(x, y - TILE_SIZE / 2 - 10, playerData.name, {
      fontSize: '10px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    // Shield sprite for remote player
    this.shieldSprite = scene.add.image(x, y, 'shield_overlay').setVisible(false).setDepth(5);
  }

  updateState(x, y, direction) {
    this.targetX = x;
    this.targetY = y;
    this.direction = direction;
    const dirStr = ['up', 'right', 'down', 'left'][direction] || 'up';
    this.setTexture(`tank_player_${dirStr}`);
  }

  updatePosition() {
    // Smooth interpolation
    const lerpSpeed = 0.3;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.nameLabel.setPosition(this.x, this.y - TILE_SIZE / 2 - 10);
    if (this.shieldSprite.visible) {
      this.shieldSprite.setPosition(this.x, this.y);
    }
  }

  destroy() {
    if (this.nameLabel) this.nameLabel.destroy();
    if (this.shieldSprite) this.shieldSprite.destroy();
    super.destroy();
  }
}
