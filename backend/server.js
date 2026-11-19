
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

// Allowed frontend origins
const allowedOrigins = [
  'https://munibhargav-1846.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header (such as server-to-server requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error('CORS blocked origin:', origin);

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
};

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();

    const app = express();
    const httpServer = http.createServer(app);

    // Socket.IO setup
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: [
          'GET',
          'POST',
          'PUT',
          'PATCH',
          'DELETE'
        ],
        credentials: true
      }
    });

    // Board presence tracking
    const boardPresence = new Map();

    const broadcastPresence = (boardId) => {
      const map = boardPresence.get(boardId);
      const unique = new Map();

      if (map) {
        for (const user of map.values()) {
          unique.set(user._id, user);
        }
      }

      io.to(`board:${boardId}`).emit(
        'board:presence',
        Array.from(unique.values())
      );
    };

    // Socket authentication
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next();
      }

      try {
        const decoded = verifyToken(token);
        socket.data.userId = decoded.userId;
      } catch (error) {
        console.error('Socket authentication failed:', error.message);
      }

      next();
    });

    // Socket connection handling
    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      if (socket.data.userId) {
        socket.join(`user:${socket.data.userId}`);
      }

      // Join board
      socket.on('board:join', ({ boardId, user } = {}) => {
        if (!boardId) return;

        socket.join(`board:${boardId}`);

        if (user?._id) {
          if (!boardPresence.has(boardId)) {
            boardPresence.set(boardId, new Map());
          }

          boardPresence.get(boardId).set(socket.id, {
            _id: user._id,
            name: user.name
          });

          broadcastPresence(boardId);
        }
      });

      // Leave board
      socket.on('board:leave', ({ boardId } = {}) => {
        if (!boardId) return;

        socket.leave(`board:${boardId}`);

        const map = boardPresence.get(boardId);

        if (map) {
          map.delete(socket.id);

          if (map.size === 0) {
            boardPresence.delete(boardId);
          } else {
            broadcastPresence(boardId);
          }
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);

        for (const [boardId, map] of boardPresence.entries()) {
          if (map.has(socket.id)) {
            map.delete(socket.id);

            if (map.size === 0) {
              boardPresence.delete(boardId);
            } else {
              broadcastPresence(boardId);
            }
          }
        }
      });
    });

    // Express CORS middleware - must come before API routes
    app.use(cors(corsOptions));

    // Handle preflight requests
    app.options(/.*/, cors(corsOptions));

    // Request body parsing
    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Attach Socket.IO to request
    app.use((req, _res, next) => {
      req.io = io;
      next();
    });

    // Static uploads
    app.use('/uploads', express.static(UPLOADS_DIR));

    // Health check
    app.get('/api/health', (_req, res) => {
      res.json({
        ok: true,
        message: 'Taskline backend is running'
      });
    });

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/workspaces', workspaceRoutes);
    app.use('/api/boards', boardRoutes);
    app.use('/api/lists', listRoutes);
    app.use('/api/cards', cardRoutes);
    app.use('/api', collaborationRoutes);

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`Taskline backend running on port ${PORT}`);
      console.log('Allowed frontend origins:', allowedOrigins);
    });

  } catch (error) {
    console.error('Failed to start Taskline backend:', error);
    process.exit(1);
  }
}

bootstrap();
