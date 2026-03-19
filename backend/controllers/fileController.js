const { v4: uuidv4 } = require('uuid');
const { pool , initDB } = require('../config/db');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// ✅ POST /api/files/upload
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description, file_type, department, year, subject } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    const id = uuidv4();
    const file_url = result.secure_url;
    const cloudinary_pub = result.public_id;
    const file_size = `${(result.bytes / 1024 / 1024).toFixed(2)} MB`;
    const is_approved = ['admin', 'faculty'].includes(req.user.role);

    await pool.query(
      `INSERT INTO files
        (id, title, description, file_url, cloudinary_public_id,
         file_type, department, year, subject, file_size, uploaded_by, is_approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        title,
        description || null,
        file_url,
        cloudinary_pub,
        file_type || 'notes',
        department || null,
        year || null,
        subject || null,
        file_size,
        req.user.id,
        is_approved
      ]
    );

    const { rows } = await pool.query(
      `SELECT f.*, u.name AS uploader_name
       FROM files f
       JOIN users u ON f.uploaded_by = u.id
       WHERE f.id = $1`,
      [id]
    );

    res.status(201).json({
      message: is_approved
        ? 'File uploaded successfully'
        : 'File uploaded — pending admin approval',
      file: rows[0],
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message || 'Error uploading file' });
  }
};

// ✅ GET /api/files
const getFiles = async (req, res) => {
  try {
    const { dept, year, type, search, page = 1, limit = 20 } = req.query;

    let where = ['f.is_approved = TRUE'];
    let params = [];

    if (dept) {
      params.push(dept);
      where.push(`f.department = $${params.length}`);
    }

    if (year) {
      params.push(year);
      where.push(`f.year = $${params.length}`);
    }

    if (type) {
      params.push(type);
      where.push(`f.file_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(`(f.title ILIKE $${params.length - 1} OR f.subject ILIKE $${params.length})`);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const queryParams = [...params, parseInt(limit), offset];

    const { rows: files } = await pool.query(
      `SELECT f.*, u.name AS uploader_name
       FROM files f
       JOIN users u ON f.uploaded_by = u.id
       WHERE ${where.join(' AND ')}
       ORDER BY f.created_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      queryParams
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM files f
       WHERE ${where.join(' AND ')}`,
      params
    );

    const total = countRows[0].total;

    res.json({
      files,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching files' });
  }
};

// ✅ GET /api/files/pending
const getPendingFiles = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, u.name AS uploader_name, u.email AS uploader_email
       FROM files f
       JOIN users u ON f.uploaded_by = u.id
       WHERE f.is_approved = FALSE
       ORDER BY f.created_at DESC`
    );

    res.json({ files: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching pending files' });
  }
};

// ✅ PUT /api/files/:id/approve
const approveFile = async (req, res) => {
  try {
    await pool.query(
      `UPDATE files SET is_approved = TRUE WHERE id = $1`,
      [req.params.id]
    );

    res.json({ message: 'File approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error approving file' });
  }
};

// ✅ DELETE /api/files/:id
const deleteFile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM files WHERE id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = rows[0];

    if (file.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorised to delete this file' });
    }

    if (file.cloudinary_public_id) {
      await deleteFromCloudinary(file.cloudinary_public_id, file.title);
    }

    await pool.query(`DELETE FROM files WHERE id = $1`, [req.params.id]);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

// ✅ POST /api/files/:id/download
const incrementDownload = async (req, res) => {
  try {
    await pool.query(
      `UPDATE files 
       SET download_count = download_count + 1 
       WHERE id = $1`,
      [req.params.id]
    );

    const { rows } = await pool.query(
      `SELECT file_url FROM files WHERE id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.json({ url: rows[0].file_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error' });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  getPendingFiles,
  approveFile,
  deleteFile,
  incrementDownload,
};