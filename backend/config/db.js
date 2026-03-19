const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: {
    rejectUnauthorized: false, // required for Neon
  },
});


const initDB = async () => {
  const client = await pool.connect();
  try {
    // USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role TEXT CHECK (role IN ('student','faculty','admin')) DEFAULT 'student',
        department VARCHAR(100),
        year VARCHAR(20),
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // FILES
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        cloudinary_public_id VARCHAR(255),
        file_type TEXT CHECK (file_type IN ('notes','paper','assignment','other')) DEFAULT 'notes',
        department VARCHAR(100),
        year VARCHAR(20),
        subject VARCHAR(150),
        file_size VARCHAR(50),
        uploaded_by UUID NOT NULL,
        download_count INT DEFAULT 0,
        is_approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // STUDY GROUPS
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_groups (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        department VARCHAR(100),
        created_by UUID NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        avatar_color VARCHAR(20) DEFAULT '#C9A84C',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // GROUP MEMBERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role TEXT CHECK (role IN ('admin','member')) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // MESSAGES
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        sender_id UUID NOT NULL,
        group_id UUID,
        is_global BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE
      );
    `);

    // ANNOUNCEMENTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority TEXT CHECK (priority IN ('low','medium','high')) DEFAULT 'low',
        created_by UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ PostgreSQL tables initialized');

    // Add column if not exists (Postgres way)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
    `);

  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };