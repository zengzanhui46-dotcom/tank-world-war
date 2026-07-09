import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import NetworkManager from '../multiplayer/NetworkManager.js';
import LEVELS from '../map/LevelData.js';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super('LobbyScene');
  }

  create() {
    this.net = null;
    this.playerName = 'Player' + Math.floor(Math.random() * 10000);
    this.myRoomCode = '';
    this.cx = GAME_WIDTH / 2;
    this.cy = GAME_HEIGHT / 2;
    this.autoJoined = false;

    // Auto-detect server URL: same origin if on Render/GitHub Pages, localhost for dev
    const origin = location.origin;
    this.serverUrl = (origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'null')
      ? 'http://localhost:3000'
      : origin;

    // Background
    this.add.rectangle(this.cx, this.cy, GAME_WIDTH, GAME_HEIGHT, 0x1a1a1a);

    // Title
    this.add.text(this.cx, 30, '多 人 联 机', {
      fontSize: '30px', fontFamily: 'Arial', color: '#42a5f5',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // ---- Server section ----
    let y = 85;
    this.add.text(this.cx, y, '服务器地址', {
      fontSize: '13px', fontFamily: 'Arial', color: '#aaa',
    }).setOrigin(0.5);

    y += 20;
    // Preset buttons

    const presets = [
      { label: '本机', url: 'http://localhost:3000' },
      { label: '局域网', url: '' }, // Will be set dynamically
    ];
    presets.forEach((p, i) => {
      const bx = this.cx - 80 + i * 160;
      if (p.label === '局域网') {
        p.url = `http://${this.getLocalIP()}:3000`;
      }
      this.makeBtn(bx, y, p.label, () => {
        this.serverUrl = p.url;
        this.serverDisplay.setText(p.url);
      }, 80, 28, 0x555555, 12);
    });

    y += 22;
    // Custom URL input hint
    this.add.text(this.cx - 170, y, '自定义:', {
      fontSize: '11px', fontFamily: 'Arial', color: '#666',
    });
    this.customUrlBg = this.add.rectangle(this.cx + 10, y, 260, 24, 0x222222)
      .setStrokeStyle(1, 0x555555).setInteractive({ useHandCursor: true });
    this.customUrlBg.on('pointerdown', () => {
      const url = prompt('输入服务器地址:', this.serverUrl);
      if (url) {
        this.serverUrl = url;
        this.serverDisplay.setText(url);
      }
    });

    y += 5;
    this.serverDisplay = this.add.text(this.cx, y + 12, this.serverUrl, {
      fontSize: '13px', fontFamily: 'monospace', color: '#4caf50',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);

    // Nickname
    y += 40;
    this.add.text(this.cx - 120, y, '昵称:', {
      fontSize: '13px', fontFamily: 'Arial', color: '#ccc',
    }).setOrigin(0.5);
    this.nameText = this.add.text(this.cx + 10, y, this.playerName, {
      fontSize: '14px', fontFamily: 'monospace', color: '#fff',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);
    this.makeBtn(this.cx + 120, y, '换名', () => {
      this.playerName = 'Player' + Math.floor(Math.random() * 10000);
      this.nameText.setText(this.playerName);
    }, 60, 24, 0x888888, 11);

    // ---- Connection status ----
    y += 40;
    this.statusText = this.add.text(this.cx, y, '⚪ 未连接', {
      fontSize: '16px', fontFamily: 'monospace', color: '#888',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // ---- Room buttons ----
    y += 40;
    this.createBtn = this.makeBtn(this.cx - 80, y, '🏠 创建房间', () => {
      this.ensureConnected(() => {
        this.net.createRoom(this.playerName);
      });
    }, 150, 40, 0x4caf50);

    this.joinBtn = this.makeBtn(this.cx + 80, y, '🚪 加入房间', () => {
      const code = prompt('输入房间号 (4位字母数字):');
      if (code && code.length >= 2) {
        this.ensureConnected(() => {
          this.net.joinRoom(code.toUpperCase(), this.playerName);
          this.myRoomCode = code.toUpperCase();
        });
      }
    }, 150, 40, 0xff9800);

    // ---- Room info (shown after creating/joining) ----
    y += 55;
    this.roomCodeText = this.add.text(this.cx, y, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd700',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);

    y += 30;
    this.playerListText = this.add.text(this.cx, y, '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ccc',
    }).setOrigin(0.5).setVisible(false);

    // ---- Start game ----
    y += 50;
    this.startBtn = this.makeBtn(this.cx, y, '🎮 开始游戏', () => {
      this.net.startGame();
    }, 200, 42, 0xffd700);
    this.startBtn.setVisible(false);
    this.startBtn.disableInteractive();

    // ---- Quick help ----
    y += 55;
    this.add.text(this.cx, y, '提示：需要先启动服务器 →', {
      fontSize: '11px', fontFamily: 'Arial', color: '#555',
    }).setOrigin(0.6);
    this.add.text(this.cx, y + 18, 'npm run server', {
      fontSize: '13px', fontFamily: 'monospace', color: '#888',
      stroke: '#000', strokeThickness: 1,
    }).setOrigin(0.5);
    this.add.text(this.cx, y + 38, '跨网络可用 ngrok 穿透: ngrok http 3000', {
      fontSize: '10px', fontFamily: 'monospace', color: '#666',
    }).setOrigin(0.5);

    // Back
    const backBtn = this.add.text(20, GAME_HEIGHT - 30, '← 返回', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffaa00',
      stroke: '#000', strokeThickness: 2,
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      if (this.net) this.net.disconnect();
      this.scene.start('MenuScene');
    });
  }

  // ---- Connection ----
  ensureConnected(callback) {
    if (this.net && this.net.isConnected()) {
      callback();
      return;
    }

    this.statusText.setText('🟡 连接中...');
    this.statusText.setColor('#ffaa00');

    // Disconnect old socket first
    if (this.net) this.net.disconnect();

    this.net = new NetworkManager(this.serverUrl);
    this.net.connect().then(() => {
      this.statusText.setText('🟢 已连接');
      this.statusText.setColor('#4caf50');
      this.setupListeners();
      callback();
    }).catch(() => {
      this.statusText.setText('🔴 无法连接服务器');
      this.statusText.setColor('#f44336');
      // Show more helpful message
      this.time.delayedCall(3000, () => {
        if (!this.net || !this.net.isConnected()) {
          this.statusText.setText('💡 请先在终端运行: npm run server');
          this.statusText.setColor('#ffaa00');
        }
      });
    });
  }

  setupListeners() {
    this.net.on('roomCreated', (data) => {
      this.myRoomCode = data.roomCode;
      this.roomCodeText.setText(`房间号: ${data.roomCode}`);
      this.roomCodeText.setVisible(true);
      this.playerListText.setText(`玩家: ${(data.players || []).map(p => p.name).join(', ')}`);
      this.playerListText.setVisible(true);
      this.statusText.setText('🏠 等待玩家加入...');
      this.statusText.setColor('#ffd700');
      this.startBtn.setVisible(true);
      this.startBtn.setInteractive();
    });

    this.net.on('roomUpdate', (data) => {
      const names = (data.players || []).map(p => p.name).join(', ');
      this.playerListText.setText(`玩家 (${data.players.length}人): ${names}`);
      this.playerListText.setVisible(true);
      if (data.players.length >= 2) {
        this.statusText.setText('✅ 可以开始游戏了！');
        this.statusText.setColor('#4caf50');
      }
    });

    this.net.on('error', (msg) => {
      this.statusText.setText(`⚠ ${msg}`);
      this.statusText.setColor('#f44336');
    });

    // Game start → enter game
    this.net.on('gameStart', (data) => {
      this.statusText.setText('🚀 进入游戏...');
      this.statusText.setColor('#4caf50');
      const otherPlayers = (data.players || []).filter(p => p.id !== this.net.playerId);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene', {
          levelData: LEVELS[0],
          multiplayer: true,
          networkManager: this.net,
          isHost: this.net.isHost,
          remotePlayers: otherPlayers,
        });
      });
    });
  }

  // ---- Helpers ----
  getLocalIP() {
    // Try to get from the page's hostname if not localhost
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return location.hostname;
    }
    return '192.168.x.x'; // Placeholder - real IP would come from --host
  }

  makeBtn(x, y, text, onClick, w = 120, h = 32, color = 0x4caf50, fontSize = 14) {
    const bg = this.add.rectangle(x, y, w, h, 0x333333)
      .setStrokeStyle(2, color)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, text, {
      fontSize: `${fontSize}px`, fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(color, 0.6));
    bg.on('pointerout', () => bg.setFillStyle(0x333333));
    bg.on('pointerdown', onClick);
    return bg;
  }
}
