import Phaser from 'phaser';
import AssetGenerator from '../utils/AssetGenerator.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Show loading bar
    const { width, height } = this.cameras.main;
    const bar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 1);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0x4caf50, 1);
      bar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });

    this.load.on('complete', () => {
      bar.destroy();
      progressBox.destroy();
    });

    // Generate all textures programmatically
    const generator = new AssetGenerator(this);
    generator.generateAll();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
