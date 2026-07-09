import { io } from 'socket.io-client';

export default class NetworkManager {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.roomCode = null;
    this.isHost = false;
    this.playerName = '';
    this._listeners = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.playerId = this.socket.id;
        this._emit('connected');
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        this._emit('error', '无法连接服务器');
        reject(err);
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this._emit('disconnected');
      });

      // Room events
      this.socket.on('room_created', (data) => {
        this.roomCode = data.roomCode;
        this.isHost = true;
        this._emit('roomCreated', data);
      });

      this.socket.on('room_update', (data) => {
        this._emit('roomUpdate', data);
      });

      this.socket.on('player_left', (data) => {
        this._emit('playerLeft', data);
      });

      this.socket.on('error_msg', (msg) => {
        this._emit('error', msg);
      });

      // Game events
      this.socket.on('game_start', (data) => {
        this.isHost = (data.hostId === this.playerId);
        this._emit('gameStart', data);
      });

      this.socket.on('remote_state', (data) => {
        this._emit('remoteState', data);
      });

      this.socket.on('remote_bullet', (data) => {
        this._emit('remoteBullet', data);
      });

      this.socket.on('enemy_sync', (data) => {
        this._emit('enemySync', data);
      });

      this.socket.on('powerup_sync', (data) => {
        this._emit('powerupSync', data);
      });

      this.socket.on('base_state', (data) => {
        this._emit('baseState', data);
      });

      this.socket.on('game_end', (data) => {
        this._emit('gameEnd', data);
      });

      this.socket.on('remote_died', (data) => {
        this._emit('remoteDied', data);
      });

      this.socket.on('remote_respawn', (data) => {
        this._emit('remoteRespawn', data);
      });
    });
  }

  // --- Room ---
  createRoom(playerName) {
    this.playerName = playerName;
    this.socket.emit('create_room', { playerName });
  }

  joinRoom(roomCode, playerName) {
    this.playerName = playerName;
    this.socket.emit('join_room', { roomCode, playerName });
  }

  startGame() {
    this.socket.emit('start_game', { roomCode: this.roomCode });
  }

  leaveRoom() {
    if (this.roomCode) {
      this.socket.emit('leave_room', { roomCode: this.roomCode });
      this.roomCode = null;
    }
  }

  // --- In-game sync (called by the local player) ---
  sendPlayerState(x, y, direction, hp, shooting) {
    this.socket.emit('player_state', {
      roomCode: this.roomCode, x, y, direction, hp, shooting,
    });
  }

  sendBullet(x, y, direction) {
    this.socket.emit('bullet_fired', {
      roomCode: this.roomCode, x, y, direction,
    });
  }

  sendEnemySync(enemies) {
    this.socket.emit('enemy_sync', {
      roomCode: this.roomCode,
      enemies: enemies.filter(e => e.active).map(e => ({
        x: e.x, y: e.y, direction: e.direction, hp: e.hp, type: e.tankTypeKey,
      })),
    });
  }

  sendPowerUpSync(powerups) {
    this.socket.emit('powerup_sync', {
      roomCode: this.roomCode,
      powerups: powerups.filter(p => p.active).map(p => ({
        x: p.x, y: p.y, type: p.powerUpType.key,
      })),
    });
  }

  sendBaseState(destroyed) {
    this.socket.emit('base_state', { roomCode: this.roomCode, destroyed });
  }

  sendGameEnd(victory) {
    this.socket.emit('game_end', { roomCode: this.roomCode, victory });
  }

  sendPlayerDied() {
    this.socket.emit('player_died', { roomCode: this.roomCode });
  }

  sendPlayerRespawn(x, y) {
    this.socket.emit('player_respawn', { roomCode: this.roomCode, x, y });
  }

  // --- Events ---
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(cb => cb(data));
  }

  isConnected() { return this.connected; }

  disconnect() {
    this.leaveRoom();
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
    this.connected = false;
  }
}
