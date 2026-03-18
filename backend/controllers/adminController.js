const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const [[{ users }]] = await pool.query('SELECT COUNT(*) as users FROM users');
    const [[{ files }]] = await pool.query('SELECT COUNT(*) as files FROM files WHERE is_approved = 1');
    const [[{ pending }]] = await pool.query('SELECT COUNT(*) as pending FROM files WHERE is_approved = 0');
    const [[{ groups }]] = await pool.query('SELECT COUNT(*) as groups FROM study_groups');
    const [[{ messages }]] = await pool.query('SELECT COUNT(*) as messages FROM messages');
    const [[{ downloads }]] = await pool.query('SELECT COALESCE(SUM(download_count), 0) as downloads FROM files');
    res.json({ users, files, pending, groups, messages, downloads });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    let where = [];
    const params = [];
    if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (role) { where.push('role = ?'); params.push(role); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [users] = await pool.query(
      `SELECT id, name, email, role, department, year, is_active, created_at FROM users ${whereClause} ORDER BY created_at DESC`,
      params
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { role, is_active, department, year } = req.body;
    const allowed = ['student', 'faculty', 'admin'];
    if (role && !allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    await pool.query(
      'UPDATE users SET role = COALESCE(?, role), is_active = COALESCE(?, is_active), department = COALESCE(?, department), year = COALESCE(?, year) WHERE id = ?',
      [role || null, is_active !== undefined ? is_active : null, department || null, year || null, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: "Cannot delete yourself" });
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// POST /api/admin/users (create admin/faculty)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, year } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Required fields missing' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, department, year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, hashed, role || 'student', department || null, year || null]
    );
    res.status(201).json({ message: 'User created', id });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

// POST /api/admin/announcements
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content required' });
    const id = uuidv4();
    await pool.query(
      'INSERT INTO announcements (id, title, content, priority, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, title, content, priority || 'low', req.user.id]
    );
    res.status(201).json({ message: 'Announcement created', id });
  } catch (err) {
    res.status(500).json({ message: 'Error creating announcement' });
  }
};

// GET /api/admin/announcements
const getAnnouncements = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.name as creator_name FROM announcements a
      JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC LIMIT 50
    `);
    res.json({ announcements: rows });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching announcements' });
  }
};

// DELETE /api/admin/announcements/:id
const deleteAnnouncement = async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
};

module.exports = { getStats, getUsers, updateUser, deleteUser, createUser, createAnnouncement, getAnnouncements, deleteAnnouncement };
