/**
 * 坦克世界大战 - 联机服务器 + 静态文件
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import GameRoom from './gameRoom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Serve static game files from dist/
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', game: '坦克世界大战', uptime: process.uptime() });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000,
});

const rooms = new Map();

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
    if (!room) { socket.emit('error_msg', '房间不存在'); return; }
    if (!room.addPlayer(socket.id, playerName || '玩家')) { socket.emit('error_msg', '房间已满'); return; }
    socket.join(roomCode);
    io.to(roomCode).emit('room_update', { players: room.getPlayerList() });
    console.log(`[加入] ${socket.id} → 房间 ${roomCode}`);
  });

  socket.on('start_game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.start();
    io.to(roomCode).emit('game_start', { hostId: room.hostId, players: room.getPlayerList() });
    console.log(`[开始] 房间 ${roomCode}`);
  });

  // In-game sync
  socket.on('player_state', ({ roomCode, x, y, direction, hp, shooting }) => {
    socket.to(roomCode).emit('remote_state', { playerId: socket.id, x, y, direction, hp, shooting });
    const room = rooms.get(roomCode);
    if (room) room.updatePlayer(socket.id, { x, y, direction, hp });
  });

  socket.on('bullet_fired', ({ roomCode, x, y, direction }) => {
    socket.to(roomCode).emit('remote_bullet', { playerId: socket.id, x, y, direction });
  });

  // Host → Clients: full game state snapshot (batched, efficient)
  socket.on('game_snapshot', ({ roomCode, snapshot }) => {
    socket.to(roomCode).emit('game_snapshot', snapshot);
  });

  // Client → Host: player input only
  socket.on('client_input', ({ roomCode, input }) => {
    socket.to(roomCode).emit('client_input', { playerId: socket.id, ...input });
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

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[断开] ${socket.id}`);
    for (const [code, room] of rooms) {
      if (room.hasPlayer(socket.id)) {
        room.removePlayer(socket.id);
        socket.to(code).emit('player_left', { playerId: socket.id });
        io.to(code).emit('room_update', { players: room.getPlayerList() });
        if (room.isEmpty()) { rooms.delete(code); console.log(`[删除] 房间 ${code}`); }
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
  console.log('  🎮 坦克世界大战');
  console.log(`  📡 http://localhost:${PORT}`);
  console.log('═══════════════════════════════════');
});
