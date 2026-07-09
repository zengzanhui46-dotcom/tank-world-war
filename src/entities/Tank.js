import Phaser from 'phaser';
import { TILE_SIZE, DIRECTIONS } from '../config.js';

export default class Tank extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, tankType) {
    super(scene, x, y, `tank_${tankType.key}_up`);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.tankTypeKey = tankType.key;
    this.tankConfig = tankType;
    this.direction = DIRECTIONS.UP;
    this.speed = tankType.speed;
    this.maxHp = tankType.hp;
    this.hp = tankType.hp;
    this.fireRate = tankType.fireRate;
    this.bulletSpeed = tankType.bulletSpeed;
    this.lastFireTime = 0;

    // Power-up state
    this.activePowerUps = {};
    this.shieldActive = false;

    // Setup physics body
    this.body.setSize(TILE_SIZE - 4, TILE_SIZE - 4);
    this.body.setOffset(2, 2);
    this.setOrigin(0.5, 0.5);

    // Shield sprite (hidden by default)
    this.shieldSprite = scene.add.image(x, y, 'shield_overlay');
    this.shieldSprite.setVisible(false);
    this.shieldSprite.setDepth(5);
  }

  move(direction) {
    this.direction = direction;
    const speed = this.getEffectiveSpeed();
    this.body.setVelocity(0, 0);

    switch (direction) {
      case DIRECTIONS.UP:
        this.body.setVelocityY(-speed);
        this.setTexture(`tank_${this.tankTypeKey}_up`);
        this.setAngle(0);
        break;
      case DIRECTIONS.DOWN:
        this.body.setVelocityY(speed);
        this.setTexture(`tank_${this.tankTypeKey}_down`);
        this.setAngle(0);
        break;
      case DIRECTIONS.LEFT:
        this.body.setVelocityX(-speed);
        this.setTexture(`tank_${this.tankTypeKey}_left`);
        this.setAngle(0);
        break;
      case DIRECTIONS.RIGHT:
        this.body.setVelocityX(speed);
        this.setTexture(`tank_${this.tankTypeKey}_right`);
        this.setAngle(0);
        break;
    }
  }

  stop() {
    this.body.setVelocity(0, 0);
  }

  shoot() {
    const now = this.scene.time.now;
    const effectiveFireRate = this.activePowerUps['rapid_fire']
      ? this.fireRate / 2
      : this.fireRate;

    if (now - this.lastFireTime < effectiveFireRate) return null;
    this.lastFireTime = now;

    const isPowerShot = !!this.activePowerUps['power_shot'];
    const bulletTexture = isPowerShot ? 'bullet_power' : 'bullet';

    let bx = this.x;
    let by = this.y;
    const offset = TILE_SIZE / 2 + 2;

    switch (this.direction) {
      case DIRECTIONS.UP: by -= offset; break;
      case DIRECTIONS.DOWN: by += offset; break;
      case DIRECTIONS.LEFT: bx -= offset; break;
      case DIRECTIONS.RIGHT: bx += offset; break;
    }

    const bullet = new Bullet(this.scene, bx, by, bulletTexture, this.direction, this.bulletSpeed, !isPowerShot, isPowerShot);
    return bullet;
  }

  getEffectiveSpeed() {
    return this.activePowerUps['speed'] ? this.speed * 1.5 : this.speed;
  }

  applyPowerUp(powerUpType) {
    if (powerUpType.key === 'health') {
      this.hp = Math.min(this.hp + 1, this.maxHp + 1);
      return;
    }

    this.activePowerUps[powerUpType.key] = true;

    if (powerUpType.key === 'shield') {
      this.shieldActive = true;
      this.shieldSprite.setVisible(true);
    }

    // Remove after duration
    if (powerUpType.duration > 0) {
      this.scene.time.delayedCall(powerUpType.duration, () => {
        this.removePowerUp(powerUpType.key);
      });
    }
  }

  removePowerUp(key) {
    delete this.activePowerUps[key];

    if (key === 'shield') {
      this.shieldActive = false;
      this.shieldSprite.setVisible(false);
    }
  }

  takeDamage(amount = 1) {
    if (this.shieldActive) return false;

    this.hp -= amount;

    // Flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    return this.hp <= 0;
  }

  isAlive() {
    return this.hp > 0;
  }

  updateShieldPosition() {
    if (this.shieldSprite) {
      this.shieldSprite.setPosition(this.x, this.y);
    }
  }

  destroy(fromScene) {
    if (this.shieldSprite) {
      this.shieldSprite.destroy();
    }
    super.destroy(fromScene);
  }
}

// Import here to avoid circular dependency
import Bullet from './Bullet.js';
