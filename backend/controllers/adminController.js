const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ✅ GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const { rows: usersRes } = await pool.query('SELECT COUNT(*)::int AS users FROM users');
    const { rows: filesRes } = await pool.query('SELECT COUNT(*)::int AS files FROM files WHERE is_approved = TRUE');
    const { rows: pendingRes } = await pool.query('SELECT COUNT(*)::int AS pending FROM files WHERE is_approved = FALSE');
    const { rows: groupsRes } = await pool.query('SELECT COUNT(*)::int AS groups FROM study_groups');
    const { rows: messagesRes } = await pool.query('SELECT COUNT(*)::int AS messages FROM messages');
    const { rows: downloadsRes } = await pool.query('SELECT COALESCE(SUM(download_count),0)::int AS downloads FROM files');

    res.json({
      users: usersRes[0].users,
      files: filesRes[0].files,
      pending: pendingRes[0].pending,
      groups: groupsRes[0].groups,
      messages: messagesRes[0].messages,
      downloads: downloadsRes[0].downloads
    });
  } catch (err) {
    console.error('getStats error', err);
    res.json({
      users: 0,
      files: 0,
      pending: 0,
      groups: 0,
      messages: 0,
      downloads: 0,
      _error: err.message
    });
  }
};

// ✅ GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    let where = [];
    let params = [];

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length - 1} OR email ILIKE $${params.length})`);
    }

    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT id, name, email, role, department, year, is_active, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// ✅ PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { role, is_active, department, year } = req.body;

    const allowed = ['student', 'faculty', 'admin'];
    if (role && !allowed.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await pool.query(
      `UPDATE users SET
        role = COALESCE($1, role),
        is_active = COALESCE($2, is_active),
        department = COALESCE($3, department),
        year = COALESCE($4, year)
       WHERE id = $5`,
      [
        role || null,
        is_active !== undefined ? is_active : null,
        department || null,
        year || null,
        req.params.id
      ]
    );

    res.json({ message: 'User updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// ✅ DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// ✅ POST /api/admin/users
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, year } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.length) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();

    await pool.query(
      `INSERT INTO users (id, name, email, password, role, department, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        name,
        email,
        hashed,
        role || 'student',
        department || null,
        year || null
      ]
    );

    res.status(201).json({ message: 'User created', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// ✅ POST /api/admin/announcements
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content required' });
    }

    const id = uuidv4();

    await pool.query(
      `INSERT INTO announcements (id, title, content, priority, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, title, content, priority || 'low', req.user.id]
    );

    res.status(201).json({ message: 'Announcement created', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating announcement' });
  }
};

// ✅ GET /api/admin/announcements
const getAnnouncements = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.name AS creator_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    res.json({ announcements: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
};

// ✅ DELETE /api/admin/announcements/:id
const deleteAnnouncement = async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM announcements WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting announcement' });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUser,
  deleteUser,
  createUser,
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement
};