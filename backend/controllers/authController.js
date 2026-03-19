const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const nodemailer = require('nodemailer');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ✅ Ensure OTP table (PostgreSQL version)
const ensureOtpTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      code VARCHAR(10) NOT NULL,
      purpose VARCHAR(32) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// ✅ Create OTP
const createOtp = async (userId, purpose = 'login', ttlMinutes = 5) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await ensureOtpTable();

  await pool.query(
    `INSERT INTO otps (id, user_id, code, purpose, expires_at, used)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, otp, purpose, expiresAt, false]
  );

  return { id, otp, expiresAt };
};

// ✅ Send OTP Email
const sendOtpEmail = async (toEmail, otp, opts = {}) => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const secureFlag =
    process.env.SMTP_SECURE === 'true' ||
    process.env.EMAIL_SECURE === 'true' ||
    port === 465;

  const from =
    process.env.FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    `no-reply@${host || 'adamas.local'}`;

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
        `Your verification code is: ${otp}. It expires in ${
          opts.ttl || 5
        } minutes.`,
      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Verification Code</h2>
          <h1>${otp}</h1>
          <p>Expires in ${opts.ttl || 5} minutes</p>
        </div>
      `,
    });

    console.log(`Sent OTP email to ${toEmail}: ${info.messageId}`);

    if (usedTestAccount) {
      console.log(
        `[OTP Preview] ${nodemailer.getTestMessageUrl(info)}`
      );
    }

    return true;
  } catch (err) {
    console.error('Email failed:', err);
    console.log(`[OTP FALLBACK] ${toEmail}: ${otp}`);
    return false;
  }
};

// ✅ Verify OTP
const verifyOtpRecord = async (id, code, purpose = 'login') => {
  await ensureOtpTable();

  const { rows } = await pool.query(
    `SELECT * FROM otps WHERE id = $1 AND purpose = $2 LIMIT 1`,
    [id, purpose]
  );

  if (!rows.length) return { ok: false, reason: 'not_found' };

  const rec = rows[0];

  if (rec.used) return { ok: false, reason: 'used' };
  if (new Date(rec.expires_at) < new Date())
    return { ok: false, reason: 'expired' };
  if (rec.code !== code) return { ok: false, reason: 'invalid' };

  await pool.query(`UPDATE otps SET used = TRUE WHERE id = $1`, [id]);

  return { ok: true, userId: rec.user_id };
};

// ✅ REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password, department, year, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Missing fields' });

    const { rows: existing } = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (existing.length)
      return res.status(409).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();

    const userRole =
      ['student', 'faculty'].includes(role) ? role : 'student';

    await pool.query(
      `INSERT INTO users 
       (id, name, email, password, role, department, year, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        name,
        email,
        hashed,
        userRole,
        department || null,
        year || null,
        false,
      ]
    );

    const { id: registerId, otp } = await createOtp(id, 'register', 10);
    await sendOtpEmail(email, otp, { ttl: 10 });

    res.status(201).json({
      otpRequired: true,
      registerId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Register error' });
  }
};

// ✅ LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (!rows.length)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];

    if (!user.is_active)
      return res.status(403).json({ message: 'Account disabled' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user.id);

    delete user.password;

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login error' });
  }
};

// ✅ VERIFY OTP
const verifyOtp = async (req, res) => {
  try {
    const id = req.body.loginId || req.body.registerId || req.body.id;
    const { code, purpose } = req.body;

    const usePurpose =
      purpose || (req.body.registerId ? 'register' : 'login');

    const result = await verifyOtpRecord(id, code, usePurpose);

    if (!result.ok)
      return res.status(400).json({ message: result.reason });

    if (usePurpose === 'register') {
      await pool.query(
        `UPDATE users SET is_verified = TRUE WHERE id = $1`,
        [result.userId]
      );
    }

    const { rows } = await pool.query(
      `SELECT id,name,email,role,department,year,avatar_url,is_active,is_verified 
       FROM users WHERE id=$1`,
      [result.userId]
    );

    const token = generateToken(result.userId);

    res.json({ token, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'OTP error' });
  }
};

// ✅ GET ME
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// ✅ UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const { name, department, year } = req.body;

    await pool.query(
      `UPDATE users 
       SET name=$1, department=$2, year=$3 
       WHERE id=$4`,
      [
        name || req.user.name,
        department || req.user.department,
        year || req.user.year,
        req.user.id,
      ]
    );

    const { rows } = await pool.query(
      `SELECT id,name,email,role,department,year,avatar_url 
       FROM users WHERE id=$1`,
      [req.user.id]
    );

    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update error' });
  }
};

module.exports = {
  register,
  login,
  verifyOtp,
  getMe,
  updateProfile,
};