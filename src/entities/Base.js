import Phaser from 'phaser';
import { TILE_SIZE } from '../config.js';

export default class Base extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, col, row) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = row * TILE_SIZE + TILE_SIZE / 2;
    super(scene, x, y, 'base');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setImmovable(true);
    this.body.setSize(TILE_SIZE - 4, TILE_SIZE - 4);
    this.setDepth(1);

    this.isDestroyed = false;
    this.col = col;
    this.row = row;
  }

  destroyBase() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.setTexture('base_destroyed');

    // Big explosion effect
    this.scene.cameras.main.shake(500, 0.02);
    this.scene.cameras.main.flash(300, 255, 0, 0);
  }

  isAlive() {
    return !this.isDestroyed;
  }
}
