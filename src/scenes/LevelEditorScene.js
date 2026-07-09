import Phaser from 'phaser';
import { TILE_SIZE, MAP_COLS, MAP_ROWS, GAME_WIDTH, GAME_HEIGHT, TILE_TYPES as TT } from '../config.js';
import { TileProperties } from '../map/TileType.js';
import { saveCustomLevel, loadCustomLevels } from '../utils/StorageManager.js';

const GRID_OFFSET_X = 40;
const GRID_OFFSET_Y = 20;

export default class LevelEditorScene extends Phaser.Scene {
  constructor() {
    super('LevelEditorScene');
  }

  create() {
    // Initialize tile data
    this.tileData = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      this.tileData[row] = [];
      for (let col = 0; col < MAP_COLS; col++) {
        this.tileData[row][col] = TT.EMPTY;
      }
    }

    this.currentTile = TT.BRICK;
    this.drawGrid();
    this.createPalette();
    this.createUI();

    // Grid interaction
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.x >= GRID_OFFSET_X && pointer.y >= GRID_OFFSET_Y) {
        const col = Math.floor((pointer.x - GRID_OFFSET_X) / TILE_SIZE);
        const row = Math.floor((pointer.y - GRID_OFFSET_Y) / TILE_SIZE);
        if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
          this.tileData[row][col] = this.currentTile;
          this.updateTileVisual(col, row);
        }
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.x >= GRID_OFFSET_X && pointer.y >= GRID_OFFSET_Y) {
        const col = Math.floor((pointer.x - GRID_OFFSET_X) / TILE_SIZE);
        const row = Math.floor((pointer.y - GRID_OFFSET_Y) / TILE_SIZE);
        if (col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS) {
          this.tileData[row][col] = this.currentTile;
          this.updateTileVisual(col, row);
        }
      }
    });
  }

  drawGrid() {
    this.gridGraphics = this.add.graphics();
    this.tileSprites = [];

    for (let row = 0; row < MAP_ROWS; row++) {
      this.tileSprites[row] = [];
      for (let col = 0; col < MAP_COLS; col++) {
        const x = GRID_OFFSET_X + col * TILE_SIZE;
        const y = GRID_OFFSET_Y + row * TILE_SIZE;

        this.gridGraphics.lineStyle(1, 0x333333, 0.5);
        this.gridGraphics.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

        const sprite = this.add.image(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 'tile_empty');
        this.tileSprites[row][col] = sprite;
      }
    }
  }

  updateTileVisual(col, row) {
    const tileType = this.tileData[row][col];
    const props = TileProperties[tileType];
    this.tileSprites[row][col].setTexture(props.texture);
  }

  createPalette() {
    const paletteX = GRID_OFFSET_X + MAP_COLS * TILE_SIZE + 20;
    const paletteY = GRID_OFFSET_Y;

    this.add.text(paletteX, paletteY - 30, '选择方块', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });

    const tiles = [
      { type: TT.EMPTY, label: '空地' },
      { type: TT.BRICK, label: '砖块' },
      { type: TT.STEEL, label: '钢铁' },
      { type: TT.WATER, label: '河流' },
      { type: TT.GRASS, label: '草丛' },
      { type: TT.ICE, label: '冰面' },
    ];

    tiles.forEach((tile, i) => {
      const y = paletteY + i * 40;
      const props = TileProperties[tile.type];

      const preview = this.add.image(paletteX + 16, y, props.texture).setScale(1.2);

      const label = this.add.text(paletteX + 40, y - 6, tile.label, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#cccccc',
      });

      const bg = this.add.rectangle(paletteX + 60, y, 120, 32, 0x333333, 0.6)
        .setStrokeStyle(1, tile.type === this.currentTile ? 0x4caf50 : 0x555555)
        .setInteractive({ useHandCursor: true });

      label.setDepth(1);
      preview.setDepth(1);

      bg.setName(`palette_${tile.type}`);
      bg.on('pointerdown', () => {
        this.currentTile = tile.type;
        // Update all palette highlights
        tiles.forEach(t => {
          const b = this.children.getByName(`palette_${t.type}`);
          if (b) b.setStrokeStyle(1, t.type === tile.type ? 0x4caf50 : 0x555555);
        });
      });
    });
  }

  createUI() {
    const btnX = GRID_OFFSET_X + MAP_COLS * TILE_SIZE + 20;
    let btnY = GRID_OFFSET_Y + 300;

    const buttons = [
      { text: '🗑 清空', action: () => this.clearAll() },
      { text: '💾 保存', action: () => this.saveLevel() },
      { text: '🔄 加载', action: () => this.showLoadDialog() },
      { text: '🎮 试玩', action: () => this.testPlay() },
      { text: '← 返回', action: () => this.scene.start('MenuScene') },
    ];

    buttons.forEach(btn => {
      const bg = this.add.rectangle(btnX + 60, btnY, 130, 35, 0x333333)
        .setStrokeStyle(1, 0x555555)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(btnX + 60, btnY, btn.text, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x4caf50, 0.5));
      bg.on('pointerout', () => bg.setFillStyle(0x333333));
      bg.on('pointerdown', btn.action);

      btnY += 45;
    });

    // Level name input hint
    this.add.text(btnX, btnY, '提示：点击格子放置方块\n右侧面板选择方块类型', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#666666',
    });
  }

  clearAll() {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        this.tileData[row][col] = TT.EMPTY;
        this.updateTileVisual(col, row);
      }
    }
  }

  saveLevel() {
    const name = `自定义关卡 ${Date.now() % 10000}`;
    const levelData = {
      id: `custom-${Date.now()}`,
      name,
      tiles: this.tileData,
      enemies: [
        { type: 'basic', count: 5 },
        { type: 'fast', count: 3 },
      ],
      powerups: ['health', 'speed'],
      playerSpawn: { col: 9, row: 18 },
      basePos: { col: 12, row: 19 },
      enemySpawns: [{ col: 0, row: 0 }, { col: 12, row: 0 }, { col: 25, row: 0 }],
    };

    saveCustomLevel(levelData);

    // Show feedback
    const feedback = this.add.text(
      GRID_OFFSET_X + (MAP_COLS * TILE_SIZE) / 2,
      GRID_OFFSET_Y + (MAP_ROWS * TILE_SIZE) / 2,
      '✅ 关卡已保存！',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#4caf50',
        stroke: '#000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: feedback,
      alpha: 0,
      y: feedback.y - 30,
      duration: 1500,
      onComplete: () => feedback.destroy(),
    });
  }

  showLoadDialog() {
    const levels = loadCustomLevels();
    if (levels.length === 0) {
      const msg = this.add.text(
        GRID_OFFSET_X + (MAP_COLS * TILE_SIZE) / 2,
        GRID_OFFSET_Y + (MAP_ROWS * TILE_SIZE) / 2,
        '没有保存的关卡',
        {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#ff9800',
          stroke: '#000',
          strokeThickness: 3,
        }
      ).setOrigin(0.5).setDepth(100);

      this.time.delayedCall(2000, () => msg.destroy());
      return;
    }

    // Show last loaded level
    const level = levels[levels.length - 1];
    this.tileData = level.tiles.map(row => [...row]);
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        this.updateTileVisual(col, row);
      }
    }
  }

  testPlay() {
    const levelData = {
      id: `test-${Date.now()}`,
      name: '编辑器测试',
      tiles: this.tileData,
      enemies: [
        { type: 'basic', count: 3 },
        { type: 'fast', count: 2 },
      ],
      powerups: ['health', 'speed', 'shield'],
      playerSpawn: { col: 9, row: 18 },
      basePos: { col: 12, row: 19 },
      enemySpawns: [{ col: 0, row: 0 }, { col: 12, row: 0 }, { col: 25, row: 0 }],
    };

    this.scene.start('GameScene', { levelData });
  }
}
