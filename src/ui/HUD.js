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

    // Canvas HUD (always shown)
    this.livesText = scene.add.text(10, 8, '', style).setDepth(200).setScrollFactor(0);
    this.enemyText = scene.add.text(10, 28, '', style).setDepth(200).setScrollFactor(0);
    this.powerUpText = scene.add.text(10, 48, '', {
      ...style, fontSize: '11px', color: '#ffd700',
    }).setDepth(200).setScrollFactor(0);
    this.levelText = scene.add.text(scene.scale.width - 10, 8, '', {
      ...style, fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);

    // HTML HUD elements (for mobile info panel)
    this.htmlLives = document.getElementById('hud-lives');
    this.htmlEnemies = document.getElementById('hud-enemies');
    this.htmlPowerups = document.getElementById('hud-powerups');
    this.htmlLevel = document.getElementById('hud-level');
  }

  update(player, totalEnemies, remainingEnemies, levelName) {
    // Canvas HUD
    this.livesText.setText(`❤ x${player.lives}`);
    this.enemyText.setText(`🎯 ${remainingEnemies}/${totalEnemies}`);
    this.levelText.setText(levelName);

    const labels = { speed: '⚡加速', shield: '🛡护盾', rapid_fire: '🔫连发', power_shot: '★穿甲' };
    const active = Object.keys(player.activePowerUps).map(k => labels[k] || k);
    this.powerUpText.setText(active.length > 0 ? `增强: ${active.join(' ')}` : '');

    // HTML HUD
    if (this.htmlLives) this.htmlLives.textContent = `❤ x${player.lives}`;
    if (this.htmlEnemies) this.htmlEnemies.textContent = `🎯 敌人: ${remainingEnemies}/${totalEnemies}`;
    if (this.htmlPowerups) this.htmlPowerups.textContent = active.length > 0 ? active.join(' ') : '';
    if (this.htmlLevel) this.htmlLevel.textContent = levelName || '';
  }

  destroy() {
    this.livesText.destroy();
    this.enemyText.destroy();
    this.powerUpText.destroy();
    this.levelText.destroy();
  }
}
