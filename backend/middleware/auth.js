const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// ✅ Protect Route Middleware
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT id, name, email, role, department, year, avatar_url, is_active
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({
        message: 'User not found or deactivated',
      });
    }

    req.user = rows[0];

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: 'Token invalid or expired',
    });
  }
};

// ✅ Admin Only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    message: 'Admin access required',
  });
};

// ✅ Faculty or Admin
const facultyOrAdmin = (req, res, next) => {
  if (req.user && ['admin', 'faculty'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    message: 'Faculty or Admin access required',
  });
};

module.exports = {
  protect,
  adminOnly,
  facultyOrAdmin,
};