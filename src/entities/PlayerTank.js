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

    // Mobile: extra-large virtual gamepad
    const gfx = scene.add.graphics().setDepth(400).setScrollFactor(0);
    const H = scene.scale.height;
    const W = scene.scale.width;

    // Bottom control bar - taller, darker
    const barH = 220;
    const barY = H - barH;
    gfx.fillStyle(0x000000, 0.65);
    gfx.fillRect(0, barY, W, barH);
    gfx.lineStyle(2, 0x444444, 0.5);
    gfx.lineBetween(0, barY, W, barY);

    // --- D-pad (left side, EXTRA LARGE) ---
    const padCX = 140, padCY = barY + 110, padR = 95;
    gfx.fillStyle(0x222222, 0.7);
    gfx.fillCircle(padCX, padCY, padR);
    gfx.lineStyle(3, 0x555555, 0.7);
    gfx.strokeCircle(padCX, padCY, padR);
    // Cross lines
    gfx.lineStyle(1, 0x444444, 0.4);
    gfx.lineBetween(padCX - padR, padCY, padCX + padR, padCY);
    gfx.lineBetween(padCX, padCY - padR, padCX, padCY + padR);

    // Direction buttons: 65x65 hit areas, 38px font
    const btnSize = 65;
    const dirs = [
      { label: '▲', x: padCX, y: padCY - 55, dir: DIRECTIONS.UP },
      { label: '▼', x: padCX, y: padCY + 55, dir: DIRECTIONS.DOWN },
      { label: '◀', x: padCX - 55, y: padCY, dir: DIRECTIONS.LEFT },
      { label: '▶', x: padCX + 55, y: padCY, dir: DIRECTIONS.RIGHT },
    ];

    dirs.forEach(d => {
      const hitBg = scene.add.rectangle(d.x, d.y, btnSize, btnSize, 0x444444, 0.5)
        .setDepth(400).setScrollFactor(0).setInteractive();
      hitBg.setStrokeStyle(1, 0x666666);
      const btn = scene.add.text(d.x, d.y, d.label, {
        fontSize: '36px', fontFamily: 'Arial', color: '#ffffff',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
      hitBg.on('pointerdown', () => { this.touchMoveDir = d.dir; hitBg.setFillStyle(0x4caf50, 0.7); });
      hitBg.on('pointerup', () => { this.touchMoveDir = null; hitBg.setFillStyle(0x444444, 0.5); });
      hitBg.on('pointerout', () => { this.touchMoveDir = null; hitBg.setFillStyle(0x444444, 0.5); });
    });

    // --- Fire button (right side, MASSIVE) ---
    const fireX = W - 140, fireY = barY + 110, fireR = 78;
    gfx.fillStyle(0xcc0000, 0.5);
    gfx.fillCircle(fireX, fireY, fireR);
    gfx.lineStyle(4, 0xff4444, 0.7);
    gfx.strokeCircle(fireX, fireY, fireR);
    // Inner ring
    gfx.lineStyle(2, 0xff8888, 0.4);
    gfx.strokeCircle(fireX, fireY, fireR - 12);

    const fireBtn = scene.add.text(fireX, fireY, '开火', {
      fontSize: '32px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
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
