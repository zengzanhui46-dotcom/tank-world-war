import Phaser from 'phaser';
import { TILE_SIZE, POWERUP_LIFETIME } from '../config.js';

export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, powerUpType) {
    super(scene, x, y, `powerup_${powerUpType.key}`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.powerUpType = powerUpType;
    this.body.setImmovable(true);
    this.body.setSize(TILE_SIZE - 8, TILE_SIZE - 8);
    this.body.setOffset(4, 4);
    this.setDepth(2);

    // Flashing effect
    this.flashTween = scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Auto-destroy after lifetime
    this.lifeTimer = scene.time.delayedCall(POWERUP_LIFETIME, () => {
      this.collect();
    });

    // Label text
    this.label = scene.add.text(x, y - TILE_SIZE / 2 - 4, powerUpType.symbol || powerUpType.label, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3);
  }

  collect() {
    if (this.flashTween) {
      this.flashTween.stop();
    }
    if (this.lifeTimer) {
      this.lifeTimer.remove();
    }
    if (this.label) {
      this.label.destroy();
    }
    this.destroy();
  }
}
