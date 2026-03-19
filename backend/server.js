require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { initDB, pool } = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const groupRoutes = require('./routes/groups');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ✅ Socket Auth Middleware (FIXED)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT id, name, role, avatar_url, department 
       FROM users 
       WHERE id = $1 AND is_active = TRUE`,
      [decoded.id]
    );

    if (!rows.length) return next(new Error('User not found'));

    socket.user = rows[0];
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Track online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const user = socket.user;

  onlineUsers.set(user.id, { socketId: socket.id, user });
  io.emit('online_users', Array.from(onlineUsers.values()).map(v => v.user));

  console.log(`🟢 ${user.name} connected (${socket.id})`);

  // Join global room
  socket.join('global');

  // Join groups
  socket.on('join_groups', async (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach(id => socket.join(`group:${id}`));
    }
  });

  // ✅ SEND GLOBAL MESSAGE (FIXED)
  socket.on('send_global_message', async (data) => {
    try {
      const { content } = data;
      if (!content || !content.trim()) return;

      const id = uuidv4();

      await pool.query(
        `INSERT INTO messages (id, content, sender_id, is_global)
         VALUES ($1, $2, $3, $4)`,
        [id, content.trim(), user.id, true]
      );

      console.log("✅ Global message saved");

      const message = {
        id,
        content: content.trim(),
        sender_id: user.id,
        sender_name: user.name,
        sender_avatar: user.avatar_url,
        sender_role: user.role,
        is_global: true,
        created_at: new Date().toISOString(),
      };

      io.to('global').emit('new_global_message', message);
    } catch (err) {
      console.error('❌ Message error:', err);
    }
  });

  // ✅ SEND GROUP MESSAGE (FIXED)
  socket.on('send_group_message', async (data) => {
    try {
      const { content, group_id } = data;
      if (!content || !group_id) return;

      const { rows: membership } = await pool.query(
        `SELECT id FROM group_members 
         WHERE group_id = $1 AND user_id = $2`,
        [group_id, user.id]
      );

      if (!membership.length && user.role !== 'admin') return;

      const id = uuidv4();

      await pool.query(
        `INSERT INTO messages (id, content, sender_id, group_id, is_global)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, content.trim(), user.id, group_id, false]
      );

      console.log("✅ Group message saved");

      const message = {
        id,
        content: content.trim(),
        sender_id: user.id,
        sender_name: user.name,
        sender_avatar: user.avatar_url,
        sender_role: user.role,
        group_id,
        is_global: false,
        created_at: new Date().toISOString(),
      };

      io.to(`group:${group_id}`).emit('new_group_message', message);
    } catch (err) {
      console.error('❌ Group message error:', err);
    }
  });

  // Typing indicators
  socket.on('typing_global', () => {
    socket.to('global').emit('user_typing', {
      name: user.name,
      room: 'global',
    });
  });

  socket.on('typing_group', ({ group_id }) => {
    socket.to(`group:${group_id}`).emit('user_typing', {
      name: user.name,
      room: group_id,
    });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(user.id);
    io.emit('online_users', Array.from(onlineUsers.values()).map(v => v.user));
    console.log(`🔴 ${user.name} disconnected`);
  });
});

// ─── Express Middleware ───────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

// Announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.name as creator_name 
      FROM announcements a
      JOIN users u ON a.created_by = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 10
    `);

    res.json({ announcements: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ─── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO ready`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });