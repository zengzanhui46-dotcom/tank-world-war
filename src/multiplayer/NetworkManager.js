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

      // Room
      this.socket.on('room_created', (data) => {
        this.roomCode = data.roomCode;
        this.isHost = true;
        this._emit('roomCreated', data);
      });
      this.socket.on('room_update', (data) => this._emit('roomUpdate', data));
      this.socket.on('player_left', (data) => this._emit('playerLeft', data));
      this.socket.on('error_msg', (msg) => this._emit('error', msg));

      // Game flow
      this.socket.on('game_start', (data) => {
        this.isHost = (data.hostId === this.playerId);
        this._emit('gameStart', data);
      });
      this.socket.on('game_end', (data) => this._emit('gameEnd', data));

      // Host → Client: full snapshot
      this.socket.on('game_snapshot', (snapshot) => {
        this._emit('gameSnapshot', snapshot);
      });

      // Client → Host: input relayed
      this.socket.on('client_input', (data) => {
        this._emit('remoteInput', data);
      });

      // Legacy compat
      this.socket.on('remote_state', (data) => this._emit('remoteState', data));
      this.socket.on('remote_bullet', (data) => this._emit('remoteBullet', data));
      this.socket.on('remote_died', (data) => this._emit('remoteDied', data));
      this.socket.on('remote_respawn', (data) => this._emit('remoteRespawn', data));
    });
  }

  // --- Room ---
  createRoom(playerName) { this.playerName = playerName; this.socket.emit('create_room', { playerName }); }
  joinRoom(roomCode, playerName) { this.playerName = playerName; this.socket.emit('join_room', { roomCode, playerName }); }
  startGame() { this.socket.emit('start_game', { roomCode: this.roomCode }); }
  leaveRoom() { if (this.roomCode) { this.socket.emit('leave_room', { roomCode: this.roomCode }); this.roomCode = null; } }

  // --- Host → Server: full game snapshot ---
  sendSnapshot(snapshot) {
    this.socket.emit('game_snapshot', { roomCode: this.roomCode, snapshot });
  }

  // --- Client → Server: only input ---
  sendInput(x, y, direction, shooting) {
    this.socket.emit('client_input', { roomCode: this.roomCode, input: { x, y, direction, shooting } });
  }

  // --- Both: game end ---
  sendGameEnd(victory) { this.socket.emit('game_end', { roomCode: this.roomCode, victory }); }

  // --- Events ---
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }
  _emit(event, data) { (this._listeners[event] || []).forEach(cb => cb(data)); }
  isConnected() { return this.connected; }
  disconnect() { this.leaveRoom(); if (this.socket) { this.socket.disconnect(); this.socket = null; } this.connected = false; }
}
