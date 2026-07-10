import Phaser from 'phaser';
import { TILE_SIZE, TANK_TYPES, DIRECTIONS, ENEMY_SPAWN_DELAY, MAX_ENEMIES_ON_SCREEN, POWERUP_SPAWN_MIN, POWERUP_SPAWN_MAX, POWERUP_MAX_ON_MAP, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import TileMap from '../map/TileMap.js';
import PlayerTank from '../entities/PlayerTank.js';
import EnemyTank from '../entities/EnemyTank.js';
import Bullet from '../entities/Bullet.js';
import Base from '../entities/Base.js';
import PowerUp from '../powerups/PowerUp.js';
import { getRandomPowerUpType } from '../powerups/PowerUpTypes.js';
import HUD from '../ui/HUD.js';
import RemoteTank from '../entities/RemoteTank.js';
import { playShoot, playExplosion, playPowerUp, playVictory, playDefeat } from '../utils/SoundManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.levelData = data.levelData;
    this.isMultiplayer = data.multiplayer || false;
    this.net = data.networkManager || null;
    this.isHost = data.isHost !== undefined ? data.isHost : true;
    this.remotePlayerInfos = data.remotePlayers || [];
  }

  create() {
    // Build tile map
    this.tileMap = new TileMap(this, this.levelData);
    this.tileMap.build();

    // Simple groups for manual bullet tracking
    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemyTanks = [];
    this.powerUps = [];

    // Create base with protection walls
    const basePos = this.levelData.basePos || { col: 12, row: 19 };
    this.base = new Base(this, basePos.col, basePos.row);
    this.buildBaseDefense(basePos.col, basePos.row);

    // Create player
    const spawn = this.levelData.playerSpawn || { col: 9, row: 18 };
    const px = spawn.col * TILE_SIZE + TILE_SIZE / 2;
    const py = spawn.row * TILE_SIZE + TILE_SIZE / 2;
    this.player = new PlayerTank(this, px, py);

    // HUD
    this.hud = new HUD(this);

    // Enemy spawning
    this.enemyQueue = this.buildEnemyQueue();
    this.totalEnemies = this.enemyQueue.length;
    this.spawnedCount = 0;
    this.enemiesOnScreen = 0;
    this.spawnTimer = 0;

    // Power-up spawning
    this.powerUpSpawnTimer = Phaser.Math.Between(POWERUP_SPAWN_MIN, POWERUP_SPAWN_MAX);

    // Game state
    this.gameEnded = false;

    // HTML pause button
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.style.display = 'block';
      pauseBtn.onclick = () => {
        this.isPaused = !this.isPaused;
        this.pauseOverlay.setVisible(this.isPaused);
        this.pauseText.setVisible(this.isPaused);
        this.resumeText.setVisible(this.isPaused);
        this.menuBtn.setVisible(this.isPaused);
        pauseBtn.textContent = this.isPaused ? '▶ 继续' : '⏸ 暂停';
      };
    }

    // Pause overlay (inside canvas)
    this.pauseOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setDepth(300).setVisible(false);
    this.pauseText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '游 戏 暂 停', {
      fontSize: '36px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(301).setVisible(false);
    this.resumeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, '点击继续', {
      fontSize: '18px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(301).setVisible(false);

    this.menuBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 65, '🏠 返回菜单', {
      fontSize: '16px', fontFamily: 'Arial', color: '#ff9800',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(301).setVisible(false).setInteractive({ useHandCursor: true });
    this.menuBtn.on('pointerover', () => this.menuBtn.setColor('#ffd700'));
    this.menuBtn.on('pointerout', () => this.menuBtn.setColor('#ff9800'));
    this.menuBtn.on('pointerdown', () => {
      if (this.isMultiplayer && this.net) this.net.disconnect();
      this.scene.start('MenuScene');
    });

    this.pauseOverlay.setInteractive();
    this.pauseOverlay.on('pointerdown', () => {
      this.isPaused = false;
      this.pauseOverlay.setVisible(false);
      this.pauseText.setVisible(false);
      this.resumeText.setVisible(false);
      this.menuBtn.setVisible(false);
      if (pauseBtn) pauseBtn.textContent = '⏸ 暂停';
    });

    this.isPaused = false;

    // ---- Multiplayer setup (Host-Authoritative Model) ----
    this.remoteTanks = [];
    this.netSyncTimer = 0;
    this.netInputTimer = 0;
    this.netSnapshotInterval = 100;  // Host sends snapshot every 100ms
    this.netInputInterval = 50;      // Client sends input every 50ms
    this.remotePlayerState = { x: 400, y: 600, direction: 0, shooting: false };
    this.clientEnemyMap = new Map(); // Client-side enemy tracking by id

    if (this.isMultiplayer && this.net) {
      // Create remote tank sprites
      this.remotePlayerInfos.forEach(p => {
        const rt = new RemoteTank(this, 400, 600, p);
        this.remoteTanks.push(rt);
      });

      // ── Client receives full snapshot from Host ──
      this.net.on('gameSnapshot', (snap) => {
        if (this.isHost) return; // Host ignores its own snapshot
        this.applySnapshot(snap);
      });

      // ── Host receives client input ──
      this.net.on('remoteInput', (data) => {
        if (!this.isHost) return;
        this.remotePlayerState.x = data.x;
        this.remotePlayerState.y = data.y;
        this.remotePlayerState.direction = data.direction;
        this.remotePlayerState.shooting = data.shooting;

        // Update remote tank visual
        let rt = this.remoteTanks.find(t => t.playerId === data.playerId);
        if (!rt) {
          rt = new RemoteTank(this, data.x, data.y, { id: data.playerId, name: '队友' });
          this.remoteTanks.push(rt);
        }
        rt.updateState(data.x, data.y, data.direction);

        // Remote player shooting → create bullet on host
        if (data.shooting) {
          const now = this.time.now;
          const rt2 = this.remoteTanks.find(t => t.playerId === data.playerId);
          if (rt2 && (!rt2._lastShot || now - rt2._lastShot > 500)) {
            rt2._lastShot = now;
            const b = new Bullet(this, rt2.targetX, rt2.targetY, 'bullet', data.direction, 300, true, false);
            b.owner = 'remote';
            this.enemyBullets.push(b);
          }
        }
      });

      // ── Both: game end ──
      this.net.on('gameEnd', (data) => {
        this.gameOver(data.victory);
      });

      // Status indicator
      this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 20, this.isHost ? '🏠 主机' : '🚪 客户端', {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);

      // If client, skip enemy/powerup spawning
      if (!this.isHost) {
        this.enemyQueue = [];
        this.totalEnemies = 0;
      }
    }
  }

  buildBaseDefense(baseCol, baseRow) {
    // Place steel walls around the base (U-shape: left, top, right)
    const positions = [
      { col: baseCol - 1, row: baseRow },     // left
      { col: baseCol + 1, row: baseRow },     // right
      { col: baseCol - 1, row: baseRow - 1 }, // top-left
      { col: baseCol,     row: baseRow - 1 }, // top
      { col: baseCol + 1, row: baseRow - 1 }, // top-right
    ];
    positions.forEach(({ col, row }) => {
      if (col >= 0 && col < 26 && row >= 0 && row < 20 && this.levelData.tiles[row][col] === 0) {
        this.levelData.tiles[row][col] = 2; // STEEL
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const wall = this.tileMap.wallGroup.create(x, y, 'tile_steel');
        wall.setVisible(false);
        wall.body.setSize(TILE_SIZE, TILE_SIZE);
        wall.refreshBody();
      }
    });
  }

  buildEnemyQueue() {
    const queue = [];
    const enemies = this.levelData.enemies || [];
    enemies.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        const config = TANK_TYPES[type.toUpperCase()];
        if (config) queue.push(config);
      }
    });
    Phaser.Utils.Array.Shuffle(queue);
    return queue;
  }

  spawnEnemy() {
    if (this.enemyQueue.length === 0) return null;
    const config = this.enemyQueue.shift();
    this.spawnedCount++;

    const spawns = this.levelData.enemySpawns || [{ col: 0, row: 0 }, { col: 12, row: 0 }, { col: 25, row: 0 }];
    const spawn = spawns[Math.floor(Math.random() * spawns.length)];
    const x = spawn.col * TILE_SIZE + TILE_SIZE / 2;
    const y = spawn.row * TILE_SIZE + TILE_SIZE / 2;

    const enemy = new EnemyTank(this, x, y, config);
    enemy.setupAI(this.tileMap, this.player, this.base);
    this.enemyTanks.push(enemy);
    this.enemiesOnScreen++;
    return enemy;
  }

  spawnPowerUp() {
    const activeCount = this.powerUps.filter(p => p.active).length;
    if (activeCount >= POWERUP_MAX_ON_MAP) return;

    const allowedTypes = this.levelData.powerups || ['health', 'speed'];
    const type = getRandomPowerUpType(allowedTypes);

    let attempts = 0;
    let col, row;
    do {
      col = Phaser.Math.Between(0, 25);
      row = Phaser.Math.Between(1, 18);
      attempts++;
    } while (attempts < 50 && (!this.tileMap.isWalkable(col, row) || this.tileMap.getTileAt(col, row) === 3));

    if (attempts >= 50) return;

    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = row * TILE_SIZE + TILE_SIZE / 2;
    const powerUp = new PowerUp(this, x, y, type);
    this.powerUps.push(powerUp);
  }

  showPowerUpMessage(powerUp) {
    const label = powerUp.powerUpType.label;
    const text = this.add.text(powerUp.x, powerUp.y - 20, `+${label}`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#ffd700',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: text, y: text.y - 40, alpha: 0, duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  spawnExplosion(x, y, big = false) {
    for (let i = 0; i < 5; i++) {
      const fi = i;
      this.time.delayedCall(fi * 60, () => {
        if (fi < 5) {
          const exp = this.add.image(x, y, `explosion_${Math.min(fi, 4)}`).setDepth(10);
          this.time.delayedCall(100, () => { if (exp && exp.active) exp.destroy(); });
        }
      });
    }
    if (big) {
      this.cameras.main.shake(200, 0.005);
    }
  }

  playerDied() {
    this.spawnExplosion(this.player.x, this.player.y, true);
    const survived = this.player.respawn();
    if (!survived) this.gameOver(false);
  }

  gameOver(victory) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    if (victory) playVictory(); else playDefeat();

    // Sync game end in multiplayer
    if (this.isHost && this.isMultiplayer && this.net && this.net.isConnected()) {
      this.net.sendGameEnd(victory);
    }

    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', { victory, levelData: this.levelData });
    });
  }

  /** Check if a bullet overlaps a tank sprite */
  bulletHitsTank(bullet, tank) {
    if (!tank || !tank.active) return false;
    return Phaser.Math.Distance.Between(bullet.x, bullet.y, tank.x, tank.y) < 16;
  }

  // ── Client: apply full snapshot from host ──
  applySnapshot(snap) {
    if (!snap) return;

    // Update remote player
    if (snap.remotePlayer) {
      let rt = this.remoteTanks.find(t => t.playerId === snap.remotePlayer.id);
      if (!rt) {
        rt = new RemoteTank(this, snap.remotePlayer.x, snap.remotePlayer.y, { id: snap.remotePlayer.id, name: '队友' });
        this.remoteTanks.push(rt);
      }
      rt.updateState(snap.remotePlayer.x, snap.remotePlayer.y, snap.remotePlayer.direction);
    }

    // Sync enemies: create/update/remove
    if (snap.enemies) {
      const seenIds = new Set();
      snap.enemies.forEach(e => {
        seenIds.add(e.id);
        let enemy = this.clientEnemyMap.get(e.id);
        if (!enemy) {
          // Create visual-only enemy on client
          const cfg = TANK_TYPES[e.type.toUpperCase()] || TANK_TYPES.BASIC;
          enemy = new EnemyTank(this, e.x, e.y, cfg);
          this.enemyTanks.push(enemy);
          this.clientEnemyMap.set(e.id, enemy);
        }
        // Smooth move toward target
        enemy.x += (e.x - enemy.x) * 0.4;
        enemy.y += (e.y - enemy.y) * 0.4;
        enemy.direction = e.direction;
        enemy.hp = e.hp;
        if (e.hp <= 0 && enemy.active) {
          enemy.destroy();
          this.clientEnemyMap.delete(e.id);
        }
      });
      // Remove enemies not in snapshot
      this.clientEnemyMap.forEach((enemy, id) => {
        if (!seenIds.has(id)) { enemy.destroy(); this.clientEnemyMap.delete(id); }
      });
    }

    // Sync powerups
    if (snap.powerups) {
      // Remove old client powerups not in snapshot
      this.powerUps.forEach((p, i) => {
        const found = snap.powerups.find(sp => Math.abs(sp.x - p.x) < 16 && Math.abs(sp.y - p.y) < 16);
        if (!found) p.collect();
      });
      // Add new ones
      snap.powerups.forEach(sp => {
        const exists = this.powerUps.find(p => Math.abs(sp.x - p.x) < 16 && Math.abs(sp.y - p.y) < 16);
        if (!exists) {
          const type = getRandomPowerUpType([sp.type]);
          const pu = new PowerUp(this, sp.x, sp.y, type);
          this.powerUps.push(pu);
        }
      });
    }

    // Base state
    if (snap.baseDestroyed && !this.base.isDestroyed) {
      this.base.destroyBase();
    }

    // Update counts
    this.totalEnemies = snap.totalEnemies || this.totalEnemies;
  }

  // ── Host: build snapshot ──
  buildSnapshot() {
    return {
      remotePlayer: {
        id: this.net.playerId,
        x: this.player.x, y: this.player.y,
        direction: this.player.direction, hp: this.player.hp,
      },
      enemies: this.enemyTanks.filter(e => e.active).map((e, i) => ({
        id: e._enemyId || (e._enemyId = Date.now() + i + Math.random()),
        x: e.x, y: e.y, direction: e.direction, hp: e.hp, type: e.tankTypeKey,
      })),
      powerups: this.powerUps.filter(p => p.active).map(p => ({
        x: p.x, y: p.y, type: p.powerUpType.key,
      })),
      baseDestroyed: this.base.isDestroyed,
      totalEnemies: this.totalEnemies,
    };
  }

  update(time, delta) {
    if (this.gameEnded || this.isPaused) return;

    // ---- Player input ----
    const bullet = this.player.handleInput(this.tileMap);
    if (bullet) {
      bullet.owner = 'player';
      this.playerBullets.push(bullet);
      playShoot();
    }

    // ---- Enemy spawning (host only) ----
    if (this.isHost || !this.isMultiplayer) {
      this.spawnTimer += delta;
      if (this.spawnTimer >= ENEMY_SPAWN_DELAY && this.enemyQueue.length > 0 && this.enemiesOnScreen < MAX_ENEMIES_ON_SCREEN) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
    }

    // ---- Enemy AI (host only) ----
    if (this.isHost || !this.isMultiplayer) {
      const liveEnemies = [...this.enemyTanks];
      for (const enemy of liveEnemies) {
        if (!enemy.active) continue;
        try {
          const eb = enemy.updateAI(delta);
          if (eb) {
            eb.owner = enemy;
            this.enemyBullets.push(eb);
          }
          enemy.updateShieldPosition();
          if (enemy.body) {
            const cols = this.tileMap.checkCollision(enemy.x, enemy.y, enemy.body.width, enemy.body.height);
            if ((enemy.direction === DIRECTIONS.UP && cols.up) || (enemy.direction === DIRECTIONS.DOWN && cols.down) ||
                (enemy.direction === DIRECTIONS.LEFT && cols.left) || (enemy.direction === DIRECTIONS.RIGHT && cols.right)) {
              enemy.stop();
              if (enemy.ai) enemy.ai.moveTimer = 9999;
            }
          }
        } catch (err) { console.error('enemy error', err); }
      }
    }

    // ---- Update bullets ----
    for (const b of this.playerBullets) { if (b.alive) b.update(time, delta); }
    for (const b of this.enemyBullets) { if (b.alive) b.update(time, delta); }

    // ---- Bullet vs tiles ----
    for (const b of this.playerBullets) {
      if (!b.alive) continue;
      b.checkTileCollision(this.tileMap);
    }
    for (const b of this.enemyBullets) {
      if (!b.alive) continue;
      b.checkTileCollision(this.tileMap);
    }

    // ---- Player bullets vs enemies ----
    for (const b of this.playerBullets) {
      if (!b.alive) continue;
      for (const enemy of this.enemyTanks) {
        if (!enemy.active) continue;
        if (this.bulletHitsTank(b, enemy)) {
          const killed = enemy.takeDamage(1);
          this.spawnExplosion(b.x, b.y);
          b.kill();
          if (killed) {
            this.spawnExplosion(enemy.x, enemy.y, true);
            enemy.destroy();
          }
          playExplosion();
          break;
        }
      }
    }

    // ---- Enemy bullets vs player ----
    for (const b of this.enemyBullets) {
      if (!b.alive) continue;
      if (this.bulletHitsTank(b, this.player)) {
        const killed = this.player.takeDamage(1);
        this.spawnExplosion(b.x, b.y);
        b.kill();
        playExplosion();
        if (killed) this.playerDied();
      }
    }

    // ---- Enemy bullets vs base ----
    for (const b of this.enemyBullets) {
      if (!b.alive) continue;
      if (this.bulletHitsTank(b, this.base)) {
        this.base.destroyBase();
        this.spawnExplosion(b.x, b.y, true);
        b.kill();
        this.gameOver(false);
      }
    }

    // ---- Player bullets vs base (friendly fire) ----
    for (const b of this.playerBullets) {
      if (!b.alive) continue;
      if (this.bulletHitsTank(b, this.base)) {
        this.base.destroyBase();
        this.spawnExplosion(b.x, b.y, true);
        b.kill();
        this.gameOver(false);
      }
    }

    // ---- Power-up pickup ----
    for (const pu of this.powerUps) {
      if (!pu.active) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pu.x, pu.y) < 20) {
        this.player.applyPowerUp(pu.powerUpType);
        this.showPowerUpMessage(pu);
        pu.collect();
        playPowerUp();
      }
      for (const enemy of this.enemyTanks) {
        if (!enemy.active || !pu.active) continue;
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, pu.x, pu.y) < 20) {
          enemy.pickupPowerUp(pu.powerUpType);
          pu.collect();
        }
      }
    }

    // ---- Cleanup ----
    this.playerBullets = this.playerBullets.filter(b => b.alive);
    this.enemyBullets = this.enemyBullets.filter(b => b.alive);
    this.enemyTanks = this.enemyTanks.filter(e => { if (!e.active || e.destroyed) { this.enemiesOnScreen--; return false; } return true; });
    this.powerUps = this.powerUps.filter(p => p.active);

    // ---- Power-up spawn (host only) ----
    if (this.isHost || !this.isMultiplayer) {
      this.powerUpSpawnTimer -= delta;
      if (this.powerUpSpawnTimer <= 0) {
        this.spawnPowerUp();
        this.powerUpSpawnTimer = Phaser.Math.Between(POWERUP_SPAWN_MIN, POWERUP_SPAWN_MAX);
      }
    }

    // ---- Win condition (host only) ----
    if (this.isHost || !this.isMultiplayer) {
      const remaining = this.enemyTanks.filter(e => e.active).length + this.enemyQueue.length;
      if (remaining === 0 && this.spawnedCount >= this.totalEnemies) {
        this.gameOver(true);
      }
    }

    // ---- HUD ----
    this.hud.update(this.player, this.totalEnemies, remaining, this.levelData.name);

    // ---- Tank-tank push apart ----
    for (const enemy of this.enemyTanks) {
      if (!enemy.active) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < TILE_SIZE - 4) {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        enemy.body.setVelocity(-Math.cos(angle) * 50, -Math.sin(angle) * 50);
      }
    }

    // ---- Multiplayer sync ----
    if (this.isMultiplayer && this.net && this.net.isConnected()) {
      if (this.isHost) {
        // Host: send full snapshot periodically
        this.netSyncTimer += delta;
        if (this.netSyncTimer >= this.netSnapshotInterval) {
          this.netSyncTimer = 0;
          this.net.sendSnapshot(this.buildSnapshot());
        }
      } else {
        // Client: send input only
        this.netInputTimer += delta;
        if (this.netInputTimer >= this.netInputInterval) {
          this.netInputTimer = 0;
          this.net.sendInput(this.player.x, this.player.y, this.player.direction, false);
        }
        // Client: skip enemy AI & spawning
        this.enemyQueue = [];
      }

      // Update remote tank visuals
      for (const rt of this.remoteTanks) {
        if (rt.visible) rt.updatePosition();
      }
    }
  }
}
