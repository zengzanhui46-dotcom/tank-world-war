export default class HUD {
  constructor(scene) {
    this.scene = scene;

    const style = {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    };

    // Lives display
    this.livesText = scene.add.text(10, 8, '', style).setDepth(200).setScrollFactor(0);

    // Enemy count
    this.enemyText = scene.add.text(10, 28, '', style).setDepth(200).setScrollFactor(0);

    // Active power-ups
    this.powerUpText = scene.add.text(10, 48, '', {
      ...style,
      fontSize: '11px',
      color: '#ffd700',
    }).setDepth(200).setScrollFactor(0);

    // Level name
    this.levelText = scene.add.text(scene.scale.width - 10, 8, '', {
      ...style,
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);
  }

  update(player, totalEnemies, remainingEnemies, levelName) {
    this.livesText.setText(`❤ x${player.lives}  HP:${player.hp}`);
    this.enemyText.setText(`🎯 剩余敌人: ${remainingEnemies}/${totalEnemies}`);
    this.levelText.setText(levelName);

    // Show active power-ups
    const activePowerUps = Object.keys(player.activePowerUps)
      .map(key => {
        const labels = {
          speed: '⚡加速',
          shield: '🛡护盾',
          rapid_fire: '🔫连发',
          power_shot: '★穿甲',
        };
        return labels[key] || key;
      });
    this.powerUpText.setText(activePowerUps.length > 0 ? `增强: ${activePowerUps.join(' ')}` : '');
  }

  destroy() {
    this.livesText.destroy();
    this.enemyText.destroy();
    this.powerUpText.destroy();
    this.levelText.destroy();
  }
}
