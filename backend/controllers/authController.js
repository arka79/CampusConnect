const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, department, year, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    // Only allow admin role if explicitly set and by another admin (handled separately)
    const userRole = ['student', 'faculty'].includes(role) ? role : 'student';

    await pool.query(
      'INSERT INTO users (id, name, email, password, role, department, year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, hashed, userRole, department || null, year || null]
    );
    const token = generateToken(id);
    res.status(201).json({
      token,
      user: { id, name, email, role: userRole, department, year, avatar_url: null },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'Account deactivated. Contact admin.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, department, year } = req.body;
    await pool.query(
      'UPDATE users SET name = ?, department = ?, year = ? WHERE id = ?',
      [name || req.user.name, department || req.user.department, year || req.user.year, req.user.id]
    );
    const [updated] = await pool.query(
      'SELECT id, name, email, role, department, year, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ user: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

module.exports = { register, login, getMe, updateProfile };
