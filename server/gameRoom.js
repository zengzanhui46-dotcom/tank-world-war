export default class GameRoom {
  constructor(roomCode, hostId) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map();   // socketId -> { id, name, x, y, direction, hp }
    this.gameStarted = false;
    this.maxPlayers = 4;
  }

  addPlayer(socketId, name) {
    if (this.players.size >= this.maxPlayers) return false;
    this.players.set(socketId, {
      id: socketId,
      name: name || '玩家',
      x: 0, y: 0, direction: 0, hp: 3,
    });
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  hasPlayer(socketId) {
    return this.players.has(socketId);
  }

  updatePlayer(socketId, data) {
    const p = this.players.get(socketId);
    if (p) Object.assign(p, data);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  getPlayerList() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id, name: p.name,
    }));
  }

  getPlayerCount() {
    return this.players.size;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  start() {
    this.gameStarted = true;
  }
}
