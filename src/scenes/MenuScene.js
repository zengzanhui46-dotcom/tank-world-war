import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Background
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x1a1a1a);

    // Title
    const title = this.add.text(cx, 100, '坦 克 世 界 大 战', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffd700',
      stroke: '#8b4513',
      strokeThickness: 6,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, 160, 'TANK WORLD WAR', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Animated tank
    const tank = this.add.image(cx, 230, 'tank_player_up');
    this.tweens.add({
      targets: tank,
      y: 240,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Menu buttons
    const buttonStyle = {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    };

    const buttons = [
      { text: '🎮 开始游戏', action: () => this.scene.start('LevelSelectScene') },
      { text: '⚔ 多人联机', action: () => this.scene.start('LobbyScene') },
      { text: '🔧 关卡编辑器', action: () => this.scene.start('LevelEditorScene') },
    ];

    buttons.forEach((btn, i) => {
      const y = 340 + i * 65;

      // Button background
      const bg = this.add.rectangle(cx, y, 280, 50, 0x333333, 0.8)
        .setStrokeStyle(2, 0x666666)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(cx, y, btn.text, buttonStyle).setOrigin(0.5);

      bg.on('pointerover', () => {
        bg.setFillStyle(0x4caf50, 0.8);
        bg.setStrokeStyle(2, 0x81c784);
        text.setScale(1.05);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x333333, 0.8);
        bg.setStrokeStyle(2, 0x666666);
        text.setScale(1.0);
      });

      bg.on('pointerdown', btn.action);
    });

    // Version
    this.add.text(cx, GAME_HEIGHT - 20, 'v1.0.0 | Made with Phaser 3', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#555555',
    }).setOrigin(0.5);

    // Title animation
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
