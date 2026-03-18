require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool, initDB } = require('./config/db');

async function seed() {
  await initDB();

  // Check if admin already exists
  const [existing] = await pool.query("SELECT id FROM users WHERE email = 'admin@adamas.ac.in'");
  if (existing.length) {
    console.log('✅ Admin already exists. Skipping seed.');
    process.exit(0);
  }

  const adminId = uuidv4();
  const hashed = await bcrypt.hash('admin123', 12);

  await pool.query(
    "INSERT INTO users (id, name, email, password, role, department) VALUES (?, ?, ?, ?, 'admin', 'Administration')",
    [adminId, 'Dr. Admin', 'admin@adamas.ac.in', hashed]
  );

  // Demo students
  const students = [
    { name: 'Rahul Sharma', email: 'rahul@adamas.ac.in', dept: 'CSE', year: '3rd Year' },
    { name: 'Priya Mondal', email: 'priya@adamas.ac.in', dept: 'ECE', year: '2nd Year' },
    { name: 'Ananya Das', email: 'ananya@adamas.ac.in', dept: 'CSE', year: '2nd Year' },
  ];

  for (const s of students) {
    const id = uuidv4();
    const pw = await bcrypt.hash('student123', 12);
    await pool.query(
      "INSERT IGNORE INTO users (id, name, email, password, role, department, year) VALUES (?, ?, ?, ?, 'student', ?, ?)",
      [id, s.name, s.email, pw, s.dept, s.year]
    );
  }

  // Demo announcement
  const annId = uuidv4();
  await pool.query(
    "INSERT INTO announcements (id, title, content, priority, created_by) VALUES (?, ?, ?, 'high', ?)",
    [annId, 'Welcome to Adamas University Platform!',
     'This platform is your central hub for study materials, campus chat, and study groups. Upload your notes and collaborate with peers!',
     adminId]
  );

  console.log('✅ Seed complete!');
  console.log('   Admin:   admin@adamas.ac.in / admin123');
  console.log('   Student: rahul@adamas.ac.in / student123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
