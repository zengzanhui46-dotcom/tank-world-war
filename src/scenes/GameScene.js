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

    // Create base
    const basePos = this.levelData.basePos || { col: 12, row: 19 };
    this.base = new Base(this, basePos.col, basePos.row);

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

    // Pause button
    this.pauseBtn = this.add.text(this.scale.width - 10, 28, '⏸ 暂停', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffaa00',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(200).setScrollFactor(0).setInteractive();

    // Pause overlay
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

    this.pauseOverlay.setInteractive();
    this.pauseOverlay.on('pointerdown', () => {
      this.isPaused = false;
      this.pauseOverlay.setVisible(false);
      this.pauseText.setVisible(false);
      this.resumeText.setVisible(false);
    });

    this.pauseBtn.on('pointerdown', () => {
      this.isPaused = true;
      this.pauseOverlay.setVisible(true);
      this.pauseText.setVisible(true);
      this.resumeText.setVisible(true);
    });

    this.isPaused = false;

    // ---- Multiplayer setup ----
    this.remoteTanks = [];
    this.netSyncTimer = 0;
    this.netSyncInterval = 50; // Send state every 50ms (20Hz)

    if (this.isMultiplayer && this.net) {
      // Create remote player tanks
      this.remotePlayerInfos.forEach(p => {
        const rt = new RemoteTank(this, 400, 600, p);
        this.remoteTanks.push(rt);
      });

      // Listen for remote state updates
      this.net.on('remoteState', (data) => {
        let rt = this.remoteTanks.find(t => t.playerId === data.playerId);
        if (!rt) {
          // New player joined
          rt = new RemoteTank(this, data.x, data.y, { id: data.playerId, name: '玩家' });
          this.remoteTanks.push(rt);
        }
        rt.updateState(data.x, data.y, data.direction);
      });

      // Remote bullet
      this.net.on('remoteBullet', (data) => {
        const b = new Bullet(this, data.x, data.y, 'bullet', data.direction, 300, true, false);
        b.owner = 'remote';
        this.enemyBullets.push(b);
        playShoot();
      });

      // Host syncs enemies/powerups/base to clients
      this.net.on('enemySync', (data) => {
        if (!this.isHost) {
          // Simple approach: just update enemy positions on client
          // Full sync would require more complex state management
        }
      });

      this.net.on('powerupSync', (data) => {
        // Could recreate power-ups from sync data if needed
      });

      this.net.on('baseState', (data) => {
        if (!this.isHost && data.destroyed && !this.base.isDestroyed) {
          this.base.destroyBase();
        }
      });

      this.net.on('gameEnd', (data) => {
        this.gameOver(data.victory);
      });

      this.net.on('remoteDied', (data) => {
        // Show remote player death
        const rt = this.remoteTanks.find(t => t.playerId === data.playerId);
        if (rt) {
          this.spawnExplosion(rt.x, rt.y, true);
          rt.setVisible(false);
        }
      });

      this.net.on('remoteRespawn', (data) => {
        const rt = this.remoteTanks.find(t => t.playerId === data.playerId);
        if (rt) {
          rt.setVisible(true);
          rt.updateState(data.x, data.y, 0);
        }
      });

      // Show multiplayer indicator
      this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 20, this.isHost ? '🏠 主机' : '🚪 客户端', {
        fontSize: '11px', fontFamily: 'monospace', color: '#ffd700',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);
    }
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
    // Sync in multiplayer
    if (this.isMultiplayer && this.net && this.net.isConnected()) {
      if (survived) {
        this.net.sendPlayerRespawn(this.player.x, this.player.y);
      } else {
        this.net.sendPlayerDied();
      }
    }
    if (!survived) this.gameOver(false);
  }

  gameOver(victory) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    if (victory) playVictory(); else playDefeat();

    // Sync game end in multiplayer
    if (this.isMultiplayer && this.net && this.net.isConnected()) {
      this.net.sendGameEnd(victory);
    }

    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', { victory, levelData: this.levelData });
    });
  }

  /** Check if a bullet overlaps a tank sprite */
  bulletHitsTank(bullet, tank) {
    if (!tank || !tank.active) return false;
    const d = Phaser.Math.Distance.Between(bullet.x, bullet.y, tank.x, tank.y);
    return d < 16; // Half tile size
  }

  update(time, delta) {
    if (this.gameEnded || this.isPaused) return;

    // ---- Player input ----
    const bullet = this.player.handleInput(this.tileMap);
    if (bullet) {
      bullet.owner = 'player';
      this.playerBullets.push(bullet);
      playShoot();
      // Sync bullet to multiplayer
      if (this.isMultiplayer && this.net && this.net.isConnected()) {
        this.net.sendBullet(bullet.x, bullet.y, bullet.direction);
      }
    }

    // ---- Enemy spawning ----
    this.spawnTimer += delta;
    if (this.spawnTimer >= ENEMY_SPAWN_DELAY && this.enemyQueue.length > 0 && this.enemiesOnScreen < MAX_ENEMIES_ON_SCREEN) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // ---- Enemy AI ----
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

    // ---- Power-up spawn ----
    this.powerUpSpawnTimer -= delta;
    if (this.powerUpSpawnTimer <= 0) {
      this.spawnPowerUp();
      this.powerUpSpawnTimer = Phaser.Math.Between(POWERUP_SPAWN_MIN, POWERUP_SPAWN_MAX);
    }

    // ---- Win condition ----
    const remaining = this.enemyTanks.filter(e => e.active).length + this.enemyQueue.length;
    if (remaining === 0 && this.spawnedCount >= this.totalEnemies) {
      this.gameOver(true);
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
      this.netSyncTimer += delta;
      if (this.netSyncTimer >= this.netSyncInterval) {
        this.netSyncTimer = 0;
        // Send my state
        this.net.sendPlayerState(
          this.player.x, this.player.y, this.player.direction, this.player.hp, false
        );

        // Host syncs game state to clients
        if (this.isHost) {
          this.net.sendEnemySync(this.enemyTanks);
          this.net.sendPowerUpSync(this.powerUps);
        }
      }

      // Update remote tanks
      for (const rt of this.remoteTanks) {
        if (rt.visible) rt.updatePosition();
      }

      // Sync base state if destroyed
      if (this.isHost && this.base.isDestroyed) {
        this.net.sendBaseState(true);
      }
    }
  }
}
