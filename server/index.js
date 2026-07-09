/**
 * 坦克世界大战 - 多人联机服务器
 * 启动: node server/index.js
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import GameRoom from './gameRoom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const httpServer = createServer((req, res) => {
  // Health check for Render / cloud hosting
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      game: '坦克世界大战',
      uptime: process.uptime(),
    }));
    return;
  }
  res.writeHead(200);
  res.end('Tank World War Server');
});
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const rooms = new Map(); // roomCode -> GameRoom

// Generate unique short room code
function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id}`);

  // --- Room management ---
  socket.on('create_room', ({ playerName }) => {
    const roomCode = genRoomCode();
    const room = new GameRoom(roomCode, socket.id);
    room.addPlayer(socket.id, playerName || '主机');
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('room_created', { roomCode, players: room.getPlayerList() });
    console.log(`[房间] ${roomCode} 由 ${socket.id} 创建`);
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error_msg', '房间不存在');
      return;
    }
    if (!room.addPlayer(socket.id, playerName || '玩家')) {
      socket.emit('error_msg', '房间已满');
      return;
    }
    socket.join(roomCode);
    // Notify everyone in room
    io.to(roomCode).emit('room_update', { players: room.getPlayerList() });
    console.log(`[加入] ${socket.id} → 房间 ${roomCode}`);
  });

  // --- Game flow ---
  socket.on('start_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.start();
    io.to(roomCode).emit('game_start', {
      hostId: room.hostId,
      players: room.getPlayerList(),
    });
    console.log(`[开始] 房间 ${roomCode} 游戏开始`);
  });

  // --- In-game sync ---
  socket.on('player_state', ({ roomCode, x, y, direction, hp, shooting }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.updatePlayer(socket.id, { x, y, direction, hp });
    // Broadcast to others in room
    socket.to(roomCode).emit('remote_state', {
      playerId: socket.id,
      x, y, direction, hp, shooting,
    });
  });

  socket.on('bullet_fired', ({ roomCode, x, y, direction }) => {
    socket.to(roomCode).emit('remote_bullet', { playerId: socket.id, x, y, direction });
  });

  socket.on('enemy_sync', ({ roomCode, enemies }) => {
    socket.to(roomCode).emit('enemy_sync', { enemies });
  });

  socket.on('powerup_sync', ({ roomCode, powerups }) => {
    socket.to(roomCode).emit('powerup_sync', { powerups });
  });

  socket.on('base_state', ({ roomCode, destroyed }) => {
    socket.to(roomCode).emit('base_state', { destroyed });
  });

  socket.on('game_end', ({ roomCode, victory }) => {
    io.to(roomCode).emit('game_end', { victory });
  });

  socket.on('player_died', ({ roomCode }) => {
    socket.to(roomCode).emit('remote_died', { playerId: socket.id });
  });

  socket.on('player_respawn', ({ roomCode, x, y }) => {
    socket.to(roomCode).emit('remote_respawn', { playerId: socket.id, x, y });
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`[断开] ${socket.id}`);
    for (const [code, room] of rooms) {
      if (room.hasPlayer(socket.id)) {
        room.removePlayer(socket.id);
        socket.to(code).emit('player_left', { playerId: socket.id });
        io.to(code).emit('room_update', { players: room.getPlayerList() });
        if (room.isEmpty()) {
          rooms.delete(code);
          console.log(`[删除] 房间 ${code} (无玩家)`);
        }
      }
    }
  });

  socket.on('leave_room', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.removePlayer(socket.id);
    socket.leave(roomCode);
    socket.to(roomCode).emit('player_left', { playerId: socket.id });
    io.to(roomCode).emit('room_update', { players: room.getPlayerList() });
    if (room.isEmpty()) rooms.delete(roomCode);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log('═══════════════════════════════════');
  console.log('  🎮 坦克世界大战 - 联机服务器');
  console.log(`  📡 http://localhost:${PORT}`);
  console.log('═══════════════════════════════════');
});
