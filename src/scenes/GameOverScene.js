import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.victory = data.victory || false;
    this.levelData = data.levelData;
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Background
    const bgColor = this.victory ? 0x1b5e20 : 0xb71c1c;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, bgColor, 0.9);

    // Result text
    const title = this.victory ? '🎉 胜 利 ！' : '💀 失 败 ！';
    const titleColor = this.victory ? '#ffd700' : '#ff5252';

    const titleText = this.add.text(cx, cy - 100, title, {
      fontSize: '52px',
      fontFamily: 'Arial',
      color: titleColor,
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: titleText,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Level name
    if (this.levelData) {
      this.add.text(cx, cy - 30, this.levelData.name, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#cccccc',
      }).setOrigin(0.5);
    }

    // Message
    const msg = this.victory
      ? '所有敌方坦克已被消灭！\n基地安全了！'
      : '基地被摧毁了...\n下次加油！';
    this.add.text(cx, cy + 20, msg, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#eeeeee',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    // Buttons
    const btnStyle = {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    };

    // Retry button
    const retryBg = this.add.rectangle(cx - 90, cy + 100, 170, 45, 0x333333)
      .setStrokeStyle(2, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    const retryText = this.add.text(cx - 90, cy + 100, '🔄 重试', btnStyle).setOrigin(0.5);

    retryBg.on('pointerover', () => retryBg.setFillStyle(0x4caf50, 0.6));
    retryBg.on('pointerout', () => retryBg.setFillStyle(0x333333));
    retryBg.on('pointerdown', () => {
      this.scene.start('GameScene', { levelData: this.levelData });
    });

    // Next level / Menu button
    const nextBg = this.add.rectangle(cx + 90, cy + 100, 170, 45, 0x333333)
      .setStrokeStyle(2, 0x42a5f5)
      .setInteractive({ useHandCursor: true });
    const nextLabel = this.victory ? '▶ 下一关' : '🏠 菜单';
    const nextText = this.add.text(cx + 90, cy + 100, nextLabel, btnStyle).setOrigin(0.5);

    nextBg.on('pointerover', () => nextBg.setFillStyle(0x42a5f5, 0.6));
    nextBg.on('pointerout', () => nextBg.setFillStyle(0x333333));
    nextBg.on('pointerdown', async () => {
      if (this.victory && this.levelData) {
        // Find next level
        const module = await import('../map/LevelData.js');
        const LEVELS = module.default;
        const idx = LEVELS.findIndex(l => l.id === this.levelData.id);
        if (idx >= 0 && idx < LEVELS.length - 1) {
          this.scene.start('GameScene', { levelData: LEVELS[idx + 1] });
        } else {
          this.scene.start('LevelSelectScene');
        }
      } else {
        this.scene.start('MenuScene');
      }
    });
  }
}
