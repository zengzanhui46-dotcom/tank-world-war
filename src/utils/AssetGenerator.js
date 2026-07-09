import Phaser from 'phaser';
import { TILE_SIZE } from '../config.js';

export default class AssetGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  generateAll() {
    this.generateTiles();
    this.generateTankTextures();
    this.generateBullet();
    this.generatePowerUpIcons();
    this.generateBase();
    this.generateExplosion();
  }

  generateTiles() {
    const S = TILE_SIZE;

    // Empty tile (just dark ground)
    const empty = this.scene.make.graphics({ add: false });
    empty.fillStyle(0x1a1a1a);
    empty.fillRect(0, 0, S, S);
    empty.generateTexture('tile_empty', S, S);
    empty.destroy();

    // Brick tile
    const brick = this.scene.make.graphics({ add: false });
    brick.fillStyle(0xb85c1e);
    brick.fillRect(0, 0, S, S);
    brick.fillStyle(0xd4783b);
    brick.fillRect(0, 0, S, 1);
    brick.fillRect(0, 0, 1, S);
    // Brick pattern
    brick.fillStyle(0x95481a);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const ox = row % 2 === 0 ? 0 : S / 4;
        brick.fillRect(ox + col * S / 2 + 2, row * S / 2 + 2, S / 2 - 3, S / 2 - 3);
      }
    }
    brick.generateTexture('tile_brick', S, S);
    brick.destroy();

    // Steel tile
    const steel = this.scene.make.graphics({ add: false });
    steel.fillStyle(0x757575);
    steel.fillRect(0, 0, S, S);
    steel.fillStyle(0xbdbdbd);
    steel.fillRect(2, 2, S - 4, S - 4);
    steel.fillStyle(0x9e9e9e);
    steel.fillRect(S / 2 - 4, 2, 8, S - 4);
    steel.fillRect(2, S / 2 - 4, S - 4, 8);
    steel.generateTexture('tile_steel', S, S);
    steel.destroy();

    // Water tile
    const water = this.scene.make.graphics({ add: false });
    water.fillStyle(0x1565c0);
    water.fillRect(0, 0, S, S);
    // Wave pattern
    water.fillStyle(0x42a5f5);
    for (let i = 0; i < 4; i++) {
      water.fillRect(0, i * 8 + 2, S, 3);
    }
    water.generateTexture('tile_water', S, S);
    water.destroy();

    // Grass tile
    const grass = this.scene.make.graphics({ add: false });
    grass.fillStyle(0x2e7d32);
    grass.fillRect(0, 0, S, S);
    grass.fillStyle(0x43a047);
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(1, S - 3);
      const y = Phaser.Math.Between(1, S - 3);
      grass.fillRect(x, y, 3, 3);
    }
    grass.generateTexture('tile_grass', S, S);
    grass.destroy();

    // Ice tile
    const ice = this.scene.make.graphics({ add: false });
    ice.fillStyle(0xb3e5fc);
    ice.fillRect(0, 0, S, S);
    ice.fillStyle(0xe1f5fe);
    ice.fillRect(1, 1, S - 2, S - 2);
    ice.lineStyle(1, 0xffffff, 0.5);
    ice.lineBetween(0, S / 2, S, S / 2);
    ice.lineBetween(S / 2, 0, S / 2, S);
    ice.generateTexture('tile_ice', S, S);
    ice.destroy();
  }

  generateTankTextures() {
    const S = TILE_SIZE;
    const H = S * 0.8; // tank body size

    const colors = {
      player: { body: 0x4caf50, track: 0x2e7d32 },
      basic: { body: 0x9e9e9e, track: 0x616161 },
      fast: { body: 0xf44336, track: 0xb71c1c },
      heavy: { body: 0x424242, track: 0x212121 },
      elite: { body: 0xffd700, track: 0xf9a825 },
    };

    // Generate 4 directions for each tank type
    Object.entries(colors).forEach(([key, { body, track }]) => {
      ['up', 'right', 'down', 'left'].forEach((dir, dirIndex) => {
        const gfx = this.scene.make.graphics({ add: false });

        // Tracks (two parallel rectangles)
        gfx.fillStyle(track);
        if (dirIndex === 0 || dirIndex === 2) {
          // Vertical orientation
          gfx.fillRect(0, 0, S * 0.2, S);
          gfx.fillRect(S * 0.8, 0, S * 0.2, S);
          // Track treads
          gfx.fillStyle(0x555555);
          for (let y = 0; y < S; y += 4) {
            gfx.fillRect(1, y, S * 0.18, 2);
            gfx.fillRect(S * 0.81, y, S * 0.18, 2);
          }
        } else {
          // Horizontal orientation
          gfx.fillRect(0, 0, S, S * 0.2);
          gfx.fillRect(0, S * 0.8, S, S * 0.2);
          gfx.fillStyle(0x555555);
          for (let x = 0; x < S; x += 4) {
            gfx.fillRect(x, 1, 2, S * 0.18);
            gfx.fillRect(x, S * 0.81, 2, S * 0.18);
          }
        }

        // Body
        gfx.fillStyle(body);
        const margin = S * 0.22;
        gfx.fillRect(margin, margin, S - margin * 2, S - margin * 2);

        // Cannon/barrel
        gfx.fillStyle(0xdddddd);
        const cx = S / 2;
        const cy = S / 2;
        const barrelW = 6;
        const barrelL = S * 0.45;
        switch (dirIndex) {
          case 0: // up
            gfx.fillRect(cx - barrelW / 2, 0, barrelW, barrelL);
            break;
          case 1: // right
            gfx.fillRect(S - barrelL, cy - barrelW / 2, barrelL, barrelW);
            break;
          case 2: // down
            gfx.fillRect(cx - barrelW / 2, S - barrelL, barrelW, barrelL);
            break;
          case 3: // left
            gfx.fillRect(0, cy - barrelW / 2, barrelL, barrelW);
            break;
        }

        gfx.generateTexture(`tank_${key}_${dir}`, S, S);
        gfx.destroy();
      });
    });

    // Shield overlay
    const shield = this.scene.make.graphics({ add: false });
    shield.lineStyle(2, 0x42a5f5, 0.8);
    shield.strokeCircle(S / 2, S / 2, S / 2);
    shield.fillStyle(0x42a5f5, 0.15);
    shield.fillCircle(S / 2, S / 2, S / 2);
    shield.generateTexture('shield_overlay', S, S);
    shield.destroy();
  }

  generateBullet() {
    const gfx = this.scene.make.graphics({ add: false });
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('bullet', 8, 8);
    gfx.destroy();

    // Power bullet
    const gfx2 = this.scene.make.graphics({ add: false });
    gfx2.fillStyle(0xffd700);
    gfx2.fillCircle(5, 5, 5);
    gfx2.fillStyle(0xff6d00, 0.6);
    gfx2.fillCircle(5, 5, 3);
    gfx2.generateTexture('bullet_power', 10, 10);
    gfx2.destroy();
  }

  generatePowerUpIcons() {
    const S = TILE_SIZE;
    const powerups = [
      { key: 'powerup_health', color: 0xff4444, symbol: '+' },
      { key: 'powerup_speed', color: 0xffeb3b, symbol: 'S' },
      { key: 'powerup_shield', color: 0x42a5f5, symbol: 'D' },
      { key: 'powerup_rapid_fire', color: 0xff9800, symbol: 'R' },
      { key: 'powerup_power_shot', color: 0xffd700, symbol: 'P' },
    ];

    powerups.forEach(({ key, color }) => {
      const gfx = this.scene.make.graphics({ add: false });
      // Background
      gfx.fillStyle(0x000000, 0.6);
      gfx.fillRoundedRect(2, 2, S - 4, S - 4, 4);
      // Border
      gfx.lineStyle(2, color, 1);
      gfx.strokeRoundedRect(2, 2, S - 4, S - 4, 4);
      // Inner fill
      gfx.fillStyle(color, 0.3);
      gfx.fillRoundedRect(4, 4, S - 8, S - 8, 3);
      gfx.generateTexture(key, S, S);
      gfx.destroy();
    });
  }

  generateBase() {
    const S = TILE_SIZE;
    const gfx = this.scene.make.graphics({ add: false });

    // Base body
    gfx.fillStyle(0x555555);
    gfx.fillRect(0, S * 0.2, S, S * 0.6);
    gfx.fillRect(S * 0.2, 0, S * 0.6, S);

    // Eagle/flag symbol
    gfx.fillStyle(0xffd700);
    gfx.fillRect(S * 0.35, S * 0.2, S * 0.3, S * 0.6);
    gfx.fillStyle(0xf44336);
    gfx.fillRect(S * 0.35, S * 0.2, S * 0.3, S * 0.3);

    gfx.generateTexture('base', S, S);
    gfx.destroy();

    // Destroyed base
    const gfx2 = this.scene.make.graphics({ add: false });
    gfx2.fillStyle(0x333333);
    gfx2.fillRect(0, 0, S, S);
    gfx2.fillStyle(0x555555);
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(0, S - 6);
      const y = Phaser.Math.Between(0, S - 6);
      gfx2.fillRect(x, y, 6, 6);
    }
    gfx2.generateTexture('base_destroyed', S, S);
    gfx2.destroy();
  }

  generateExplosion() {
    const frames = [];
    for (let i = 0; i < 5; i++) {
      const gfx = this.scene.make.graphics({ add: false });
      const radius = 4 + i * 4;
      const alpha = 1 - i * 0.15;
      gfx.fillStyle(0xff6600, alpha);
      gfx.fillCircle(radius + 2, radius + 2, radius);
      gfx.fillStyle(0xffcc00, alpha * 0.7);
      gfx.fillCircle(radius + 2, radius + 2, radius * 0.6);
      gfx.generateTexture(`explosion_${i}`, radius * 2 + 4, radius * 2 + 4);
      gfx.destroy();
      frames.push(i);
    }
  }
}
