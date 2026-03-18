const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const nodemailer = require('nodemailer');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Ensure otps table exists
const ensureOtpTable = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS otps (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
};

const createOtp = async (userId, purpose = 'login', ttlMinutes = 5) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await ensureOtpTable();
  await pool.query('INSERT INTO otps (id, user_id, code, purpose, expires_at, used) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, otp, purpose, expiresAt, 0]);
  return { id, otp, expiresAt };
};

// Attempt to send OTP by email using nodemailer. Falls back to console logging if SMTP not configured.
const sendOtpEmail = async (toEmail, otp, opts = {}) => {
  // Support both SMTP_* and EMAIL_* env var names (some setups use EMAIL_*)
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secureFlag = (process.env.SMTP_SECURE === 'true') || (process.env.EMAIL_SECURE === 'true') || (port === 465);
  const from = process.env.FROM_EMAIL || process.env.EMAIL_FROM || `no-reply@${host || 'adamas.local'}`;

  try {
    let transporter;
    let usedTestAccount = false;

    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: secureFlag,
        auth: { user, pass },
      });
    } else {
      // Create a test account (Ethereal) when SMTP not configured — useful for local/dev
      const testAcct = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAcct.smtp.host,
        port: testAcct.smtp.port,
        secure: testAcct.smtp.secure,
        auth: { user: testAcct.user, pass: testAcct.pass },
      });
      usedTestAccount = true;
    }

   const info = await transporter.sendMail({
  from,
  to: toEmail,
  subject: opts.subject || 'Your campus verification code',
  text:
    opts.text ||
    `Your verification code is: ${otp}. It expires in ${opts.ttl || 5} minutes.`,
  html:
    opts.html ||
    `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
      <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
        
        <h2 style="color: #333; margin-bottom: 10px;">🔐 Adamas Verification</h2>
        
        <p style="color: #666; font-size: 14px; margin-bottom: 25px;">
          Use the verification code below to continue
        </p>

        <div style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #4A90E2; background: #f0f6ff; padding: 15px 20px; border-radius: 8px; display: inline-block; margin-bottom: 20px;">
          ${otp}
        </div>

        <p style="color: #999; font-size: 13px;">
          This code will expire in <strong>${opts.ttl || 5} minutes</strong>.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />

        <p style="color: #bbb; font-size: 12px;">
          If you didn’t request this, you can safely ignore this email.
        </p>

      </div>
    </div>
    `,
});

    console.log(`Sent OTP email to ${toEmail}: ${info.messageId}`);
    if (usedTestAccount) {
      const preview = nodemailer.getTestMessageUrl(info);
      console.log(`[OTP] Preview URL (ethereal): ${preview}`);
    }
    return true;
  } catch (err) {
    console.error('Failed to send OTP email', err);
    console.log(`[OTP] Fallback - OTP for ${toEmail}: ${otp}`);
    return false;
  }
};

const verifyOtpRecord = async (id, code, purpose = 'login') => {
  await ensureOtpTable();
  const [rows] = await pool.query('SELECT * FROM otps WHERE id = ? AND purpose = ? LIMIT 1', [id, purpose]);
  if (!rows.length) return { ok: false, reason: 'not_found' };
  const rec = rows[0];
  if (rec.used) return { ok: false, reason: 'used' };
  if (new Date(rec.expires_at) < new Date()) return { ok: false, reason: 'expired' };
  if (rec.code !== code) return { ok: false, reason: 'invalid' };
  await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [id]);
  return { ok: true, userId: rec.user_id };
};

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

    // Ensure users table has is_verified column (added in schema init)
    try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified TINYINT(1) DEFAULT 0;"); } catch (e) { /* ignore */ }

    // Create the user but mark as not verified yet
    await pool.query(
      'INSERT INTO users (id, name, email, password, role, department, year, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, hashed, userRole, department || null, year || null, 0]
    );

    // Generate OTP for registration verification
    const { id: registerId, otp } = await createOtp(id, 'register', 10);
    try { await sendOtpEmail(email, otp, { ttl: 10 }); } catch (e) { console.error('Error sending register OTP', e); }

    // Return OTP required response
    res.status(201).json({ otpRequired: true, registerId, message: 'OTP sent to your email for verification' });
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
    // Issue JWT directly (no OTP step)
    const token = generateToken(user.id);
    // Return sanitized user object (omit password)
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      is_verified: user.is_verified
    };
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    // Accept flexible body keys for backward compatibility: loginId, registerId or id
    const id = req.body.loginId || req.body.registerId || req.body.id;
    const { code, purpose } = req.body;
    if (!id || !code) return res.status(400).json({ message: 'id and code required' });
    const usePurpose = purpose || (req.body.registerId ? 'register' : 'login');
    const result = await verifyOtpRecord(id, code, usePurpose);
    if (!result.ok) {
      const map = { not_found: 'Invalid session', used: 'OTP already used', expired: 'OTP expired', invalid: 'Invalid code' };
      return res.status(400).json({ message: map[result.reason] || 'OTP verification failed' });
    }
    const userId = result.userId;

    // If this was a registration verification, mark user as verified
    if (usePurpose === 'register') {
      try {
        await pool.query('UPDATE users SET is_verified = 1 WHERE id = ?', [userId]);
      } catch (e) { console.error('Failed to mark user verified', e); }
    }

    const [rows] = await pool.query('SELECT id, name, email, role, department, year, avatar_url, is_active, is_verified FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
    const token = generateToken(user.id);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during OTP verification' });
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

module.exports = { register, login, verifyOtp, getMe, updateProfile };
