import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db.js';
import { verifyToken } from './middleware/auth.js';
import { UPLOADS_DIR } from './middleware/upload.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import boardRoutes from './routes/boardRoutes.js';
import listRoutes from './routes/listRoutes.js';
import cardRoutes from './routes/cardRoutes.js';
import collaborationRoutes from './routes/collaborationRoutes.js';

const PORT = Number(process.env.PORT || 5000);

async function bootstrap() {
  await connectDB();

  const app = express();
  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  const boardPresence = new Map();
  const broadcastPresence = (boardId) => {
    const map = boardPresence.get(boardId);
    const unique = new Map();
    if (map) {
      for (const u of map.values()) unique.set(u._id, u);
    }
    io.to(`board:${boardId}`).emit('board:presence', Array.from(unique.values()));
  };

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
    } catch {
      // ignore invalid token
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    socket.on('board:join', ({ boardId, user }) => {
      if (!boardId) return;
      socket.join(`board:${boardId}`);
      if (user?._id) {
        if (!boardPresence.has(boardId)) boardPresence.set(boardId, new Map());
        boardPresence.get(boardId).set(socket.id, { _id: user._id, name: user.name });
        broadcastPresence(boardId);
      }
    });

    socket.on('board:leave', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(`board:${boardId}`);
      const map = boardPresence.get(boardId);
      if (map) {
        map.delete(socket.id);
        broadcastPresence(boardId);
      }
    });

    socket.on('disconnect', () => {
      for (const [boardId, map] of boardPresence.entries()) {
        if (map.has(socket.id)) {
          map.delete(socket.id);
          broadcastPresence(boardId);
        }
      }
    });
  });

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Attach io to req
  app.use((req, _res, next) => {
    req.io = io;
    next();
  });

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/boards', boardRoutes);
  app.use('/api/lists', listRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api', collaborationRoutes);

  httpServer.listen(PORT, () => {
    console.log(`Taskline backend server running on http://localhost:${PORT}`);
  });
}

bootstrap();
