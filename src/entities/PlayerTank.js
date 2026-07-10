import Tank from './Tank.js';
import { TANK_TYPES, DIRECTIONS } from '../config.js';

export default class PlayerTank extends Tank {
  constructor(scene, x, y) {
    super(scene, x, y, TANK_TYPES.PLAYER);
    this.lives = 3;
    this.spawnX = x;
    this.spawnY = y;

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard.addKey('W'),
      down: scene.input.keyboard.addKey('S'),
      left: scene.input.keyboard.addKey('A'),
      right: scene.input.keyboard.addKey('D'),
    };
    this.spaceKey = scene.input.keyboard.addKey('SPACE');
    this.shootKey = scene.input.keyboard.addKey('J'); // Alternative shoot key

    // Touch controls
    this.setupTouchControls(scene);
  }

  setupTouchControls(scene) {
    this.touchMoveDir = null;
    this.touchFire = false;

    const isMobile = !scene.sys.game.device.os.desktop;
    if (!isMobile) {
      // Desktop: simple invisible touch zones
      scene.input.on('pointerdown', (pointer) => {
        if (pointer.x < scene.scale.width / 3) this.touchMoveDir = this.getTouchDir(pointer);
        else this.touchFire = true;
      });
      scene.input.on('pointermove', (pointer) => {
        if (pointer.isDown && pointer.x < scene.scale.width / 3) this.touchMoveDir = this.getTouchDir(pointer);
      });
      scene.input.on('pointerup', () => { this.touchMoveDir = null; this.touchFire = false; });
      return;
    }

    // Mobile: large visible virtual gamepad
    const gfx = scene.add.graphics().setDepth(400).setScrollFactor(0);
    const H = scene.scale.height;
    const W = scene.scale.width;

    // Bottom control bar background
    const barY = H - 170;
    gfx.fillStyle(0x000000, 0.5);
    gfx.fillRect(0, barY, W, 170);

    // --- D-pad (left side, BIG) ---
    const padCX = 120, padCY = barY + 85, padR = 80;
    gfx.fillStyle(0x333333, 0.6);
    gfx.fillCircle(padCX, padCY, padR);
    gfx.lineStyle(3, 0x666666, 0.6);
    gfx.strokeCircle(padCX, padCY, padR);

    // Direction arrows with big hit areas
    const btnSize = 50;
    const dirs = [
      { label: '▲', x: padCX, y: padCY - 40, dir: DIRECTIONS.UP },
      { label: '▼', x: padCX, y: padCY + 40, dir: DIRECTIONS.DOWN },
      { label: '◀', x: padCX - 45, y: padCY, dir: DIRECTIONS.LEFT },
      { label: '▶', x: padCX + 45, y: padCY, dir: DIRECTIONS.RIGHT },
    ];

    dirs.forEach(d => {
      // Hit area background
      const hitBg = scene.add.rectangle(d.x, d.y, btnSize, btnSize, 0xffffff, 0.15)
        .setDepth(400).setScrollFactor(0).setInteractive();
      const btn = scene.add.text(d.x, d.y, d.label, {
        fontSize: '30px', fontFamily: 'Arial', color: '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
      hitBg.on('pointerdown', () => { this.touchMoveDir = d.dir; hitBg.setFillStyle(0x4caf50, 0.4); });
      hitBg.on('pointerup', () => { this.touchMoveDir = null; hitBg.setFillStyle(0xffffff, 0.15); });
      hitBg.on('pointerout', () => { this.touchMoveDir = null; hitBg.setFillStyle(0xffffff, 0.15); });
    });

    // --- Fire button (right side, HUGE) ---
    const fireX = W - 110, fireY = barY + 85, fireR = 65;
    gfx.fillStyle(0xff4444, 0.35);
    gfx.fillCircle(fireX, fireY, fireR);
    gfx.lineStyle(4, 0xff6666, 0.6);
    gfx.strokeCircle(fireX, fireY, fireR);

    const fireBtn = scene.add.text(fireX, fireY, '开火', {
      fontSize: '26px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(401).setScrollFactor(0).setInteractive();

    fireBtn.on('pointerdown', () => { this.touchFire = true; });
    fireBtn.on('pointerup', () => { this.touchFire = false; });
    fireBtn.on('pointerout', () => { this.touchFire = false; });
  }

  getTouchDir(pointer) {
    const cx = this.scene.scale.width / 6;
    const cy = this.scene.scale.height / 2;
    const dx = pointer.x - cx, dy = pointer.y - cy;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
    return dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
  }

  handleInput(tileMap) {
    let moveDir = null;
    let shouldShoot = false;

    // Keyboard input
    if (this.cursors.up.isDown || this.wasd.up.isDown) moveDir = DIRECTIONS.UP;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) moveDir = DIRECTIONS.DOWN;
    else if (this.cursors.left.isDown || this.wasd.left.isDown) moveDir = DIRECTIONS.LEFT;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) moveDir = DIRECTIONS.RIGHT;

    if (this.cursors.space.isDown || this.shootKey.isDown) shouldShoot = true;

    // Touch input overrides
    if (this.touchMoveDir !== null) {
      moveDir = this.touchMoveDir;
    }
    if (this.touchFire) {
      shouldShoot = true;
    }

    // Apply movement
    if (moveDir !== null) {
      this.move(moveDir);

      // Check tile collision
      const collisions = tileMap.checkCollision(this.x, this.y, this.body.width, this.body.height);
      if ((moveDir === DIRECTIONS.UP && collisions.up) ||
          (moveDir === DIRECTIONS.DOWN && collisions.down) ||
          (moveDir === DIRECTIONS.LEFT && collisions.left) ||
          (moveDir === DIRECTIONS.RIGHT && collisions.right)) {
        this.stop();
      }
    } else {
      this.stop();
    }

    // Check if on ice for sliding
    if (moveDir !== null) {
      const col = Math.floor(this.x / 32);
      const row = Math.floor(this.y / 32);
      if (tileMap.isSlippery(col, row)) {
        // On ice - reduce deceleration for sliding effect
        this.body.setDrag(50, 50);
      } else {
        this.body.setDrag(1000, 1000);
      }
    }

    // Shooting
    if (shouldShoot) {
      return this.shoot();
    }

    return null;
  }

  respawn() {
    this.lives--;
    if (this.lives <= 0) return false;

    this.hp = this.maxHp;
    this.setPosition(this.spawnX, this.spawnY);
    this.stop();
    this.clearTint();

    // Remove all active power-ups
    Object.keys(this.activePowerUps).forEach(key => this.removePowerUp(key));

    // Brief invulnerability
    this.shieldActive = true;
    this.shieldSprite.setVisible(true);
    this.scene.time.delayedCall(2000, () => {
      this.shieldActive = false;
      this.shieldSprite.setVisible(false);
    });

    return true;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.updateShieldPosition();
  }
}
