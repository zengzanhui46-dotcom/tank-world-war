import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LobbyScene from './scenes/LobbyScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-area',
  backgroundColor: '#000000',
  pixelArt: true,
  autoRound: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, LevelSelectScene, GameOverScene, LobbyScene],
};

const game = new Phaser.Game(config);

// ── Responsive resize: fit canvas into #game-area while keeping aspect ratio ──
function resizeGame() {
  const area = document.getElementById('game-area');
  if (!area) return;

  const maxW = area.clientWidth;
  const maxH = area.clientHeight;
  const ratio = GAME_WIDTH / GAME_HEIGHT;

  let w, h;
  if (maxW / maxH > ratio) {
    h = maxH;
    w = h * ratio;
  } else {
    w = maxW;
    h = w / ratio;
  }

  const canvas = game.canvas;
  canvas.style.width = Math.floor(w) + 'px';
  canvas.style.height = Math.floor(h) + 'px';
}

window.addEventListener('resize', resizeGame);
// Also observe #game-area size changes (e.g. control bar toggling)
if (window.ResizeObserver) {
  new ResizeObserver(resizeGame).observe(document.getElementById('game-area'));
}
// Initial resize after Phaser is ready
game.events.on('ready', () => {
  setTimeout(resizeGame, 50);
  setTimeout(resizeGame, 200);
  setTimeout(resizeGame, 500);
});
