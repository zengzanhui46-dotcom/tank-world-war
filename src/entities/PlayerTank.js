import Tank from './Tank.js';
import { TANK_TYPES, DIRECTIONS } from '../config.js';

export default class PlayerTank extends Tank {
  constructor(scene, x, y) {
    super(scene, x, y, TANK_TYPES.PLAYER);
    this.lives = 3;
    this.spawnX = x;
    this.spawnY = y;

    // Keyboard
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = {
      up: scene.input.keyboard.addKey('W'),
      down: scene.input.keyboard.addKey('S'),
      left: scene.input.keyboard.addKey('A'),
      right: scene.input.keyboard.addKey('D'),
    };
    this.spaceKey = scene.input.keyboard.addKey('SPACE');
    this.shootKey = scene.input.keyboard.addKey('J');

    // Mobile: bind to HTML controls
    this.touchMoveDir = null;
    this.touchFire = false;
    this.setupHTMLControls();
  }

  setupHTMLControls() {
    // Direction buttons
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    dpadBtns.forEach(btn => {
      const dirMap = { up: DIRECTIONS.UP, down: DIRECTIONS.DOWN, left: DIRECTIONS.LEFT, right: DIRECTIONS.RIGHT };
      const onDown = (e) => {
        e.preventDefault();
        this.touchMoveDir = dirMap[btn.dataset.dir];
        btn.classList.add('pressed');
      };
      const onUp = (e) => {
        e.preventDefault();
        this.touchMoveDir = null;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerdown', onDown);
      btn.addEventListener('pointerup', onUp);
      btn.addEventListener('pointerleave', onUp);
      btn.addEventListener('pointercancel', onUp);
    });

    // Fire button
    const fireBtn = document.getElementById('fire-btn');
    if (fireBtn) {
      fireBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.touchFire = true;
        fireBtn.classList.add('pressed');
      });
      fireBtn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.touchFire = false;
        fireBtn.classList.remove('pressed');
      });
      fireBtn.addEventListener('pointerleave', (e) => {
        this.touchFire = false;
        fireBtn.classList.remove('pressed');
      });
      fireBtn.addEventListener('pointercancel', (e) => {
        this.touchFire = false;
        fireBtn.classList.remove('pressed');
      });
    }

    // Control bar always visible on mobile
    const bar = document.getElementById('control-bar');
    if (bar) bar.style.display = 'flex';
  }

  handleInput(tileMap) {
    let moveDir = null;
    let shouldShoot = false;

    // Keyboard
    if (this.cursors.up.isDown || this.wasd.up.isDown) moveDir = DIRECTIONS.UP;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) moveDir = DIRECTIONS.DOWN;
    else if (this.cursors.left.isDown || this.wasd.left.isDown) moveDir = DIRECTIONS.LEFT;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) moveDir = DIRECTIONS.RIGHT;
    if (this.cursors.space.isDown || this.shootKey.isDown) shouldShoot = true;

    // Mobile touch overrides keyboard
    if (this.touchMoveDir !== null) moveDir = this.touchMoveDir;
    if (this.touchFire) shouldShoot = true;

    // Movement
    if (moveDir !== null) {
      this.move(moveDir);
      const collisions = tileMap.checkCollision(this.x, this.y, this.body.width, this.body.height);
      if ((moveDir === DIRECTIONS.UP && collisions.up) ||
          (moveDir === DIRECTIONS.DOWN && collisions.down) ||
          (moveDir === DIRECTIONS.LEFT && collisions.left) ||
          (moveDir === DIRECTIONS.RIGHT && collisions.right)) {
        this.stop();
      }
      // Ice sliding
      const col = Math.floor(this.x / 32);
      const row = Math.floor(this.y / 32);
      this.body.setDrag(tileMap.isSlippery(col, row) ? 50 : 1000);
    } else {
      this.stop();
    }

    if (shouldShoot) return this.shoot();
    return null;
  }

  respawn() {
    this.lives--;
    if (this.lives <= 0) return false;
    this.hp = this.maxHp;
    this.setPosition(this.spawnX, this.spawnY);
    this.stop();
    this.clearTint();
    Object.keys(this.activePowerUps).forEach(k => this.removePowerUp(k));
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
