import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import LEVELS from '../map/LevelData.js';
import { loadCustomLevels } from '../utils/StorageManager.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Background
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a1a);

    // Title
    this.add.text(cx, 40, '选 择 关 卡', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Render built-in levels
    this.renderLevelGrid(LEVELS, 0);

    // Load custom levels async
    loadCustomLevels().then(customLevels => {
      if (customLevels && customLevels.length > 0) {
        this.renderLevelGrid(customLevels, LEVELS.length);
      }
    });

    // Back button
    const backBtn = this.add.text(20, GAME_HEIGHT - 35, '← 返回', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffaa00',
      stroke: '#000',
      strokeThickness: 2,
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    backBtn.on('pointerover', () => backBtn.setColor('#ffd700'));
    backBtn.on('pointerout', () => backBtn.setColor('#ffaa00'));
  }

  renderLevelGrid(levels, offsetIndex) {
    const cx = GAME_WIDTH / 2;
    const startY = 100;
    const cols = 3;
    const cardW = 240;
    const cardH = 100;
    const gapX = 20;
    const gapY = 20;
    // Fixed grid start - always center based on 3 columns
    const gridStartX = cx - ((cols * (cardW + gapX) - gapX) / 2);

    levels.forEach((level, i) => {
      const idx = offsetIndex + i;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = gridStartX + col * (cardW + gapX) + cardW / 2;
      const y = startY + row * (cardH + gapY);

      const isBuiltIn = offsetIndex === 0;

      const bg = this.add.rectangle(x, y, cardW, cardH, 0x333333, 0.8)
        .setStrokeStyle(2, isBuiltIn ? 0x4caf50 : 0xff9800)
        .setInteractive({ useHandCursor: true });

      this.add.text(x, y - 20, `#${idx + 1}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#888888',
      }).setOrigin(0.5);

      this.add.text(x, y + 5, level.name, {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5);

      const tag = isBuiltIn ? '内置' : '自定义';
      const tagColor = isBuiltIn ? '#4caf50' : '#ff9800';
      this.add.text(x, y + 30, tag, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: tagColor,
      }).setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x4caf50, 0.6));
      bg.on('pointerout', () => bg.setFillStyle(0x333333, 0.8));
      bg.on('pointerdown', () => {
        this.scene.start('GameScene', { levelData: level });
      });
    });
  }
}
