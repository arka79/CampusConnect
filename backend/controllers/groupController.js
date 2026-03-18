const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

const COLORS = ['#C9A84C', '#1A5FA8', '#1A7A4A', '#8B4A9C', '#C0392B', '#E67E22', '#2980B9'];

// POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name, description, department, is_private } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name is required' });
    const id = uuidv4();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    await pool.query(
      'INSERT INTO study_groups (id, name, description, department, created_by, is_private, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, description || null, department || null, req.user.id, is_private ? 1 : 0, color]
    );
    // Add creator as admin member
    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [id, req.user.id, 'admin']
    );
    const [group] = await pool.query(
      `SELECT sg.*, u.name as creator_name,
       (SELECT COUNT(*) FROM group_members WHERE group_id = sg.id) as member_count
       FROM study_groups sg JOIN users u ON sg.created_by = u.id WHERE sg.id = ?`, [id]
    );
    res.status(201).json({ group: group[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating group' });
  }
};

// GET /api/groups
const getGroups = async (req, res) => {
  try {
    const [groups] = await pool.query(`
      SELECT sg.*, u.name as creator_name,
      (SELECT COUNT(*) FROM group_members WHERE group_id = sg.id) as member_count,
      EXISTS(SELECT 1 FROM group_members WHERE group_id = sg.id AND user_id = ?) as is_member
      FROM study_groups sg JOIN users u ON sg.created_by = u.id
      WHERE sg.is_private = 0 OR sg.created_by = ? OR
        EXISTS(SELECT 1 FROM group_members WHERE group_id = sg.id AND user_id = ?)
      ORDER BY sg.created_at DESC
    `, [req.user.id, req.user.id, req.user.id]);
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

// POST /api/groups/:id/join
const joinGroup = async (req, res) => {
  try {
    const [group] = await pool.query('SELECT * FROM study_groups WHERE id = ?', [req.params.id]);
    if (!group.length) return res.status(404).json({ message: 'Group not found' });
    const [existing] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length) return res.status(409).json({ message: 'Already a member' });
    await pool.query('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
    res.json({ message: 'Joined group successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error joining group' });
  }
};

// DELETE /api/groups/:id/leave
const leaveGroup = async (req, res) => {
  try {
    await pool.query('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Left group' });
  } catch (err) {
    res.status(500).json({ message: 'Error leaving group' });
  }
};

// GET /api/groups/:id/members
const getMembers = async (req, res) => {
  try {
    const [members] = await pool.query(`
      SELECT u.id, u.name, u.email, u.department, u.year, u.avatar_url, gm.role, gm.joined_at
      FROM group_members gm JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ? ORDER BY gm.role DESC, gm.joined_at ASC
    `, [req.params.id]);
    res.json({ members });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching members' });
  }
};

// DELETE /api/groups/:id (admin only or group creator)
const deleteGroup = async (req, res) => {
  try {
    const [group] = await pool.query('SELECT * FROM study_groups WHERE id = ?', [req.params.id]);
    if (!group.length) return res.status(404).json({ message: 'Group not found' });
    if (group[0].created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await pool.query('DELETE FROM study_groups WHERE id = ?', [req.params.id]);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting group' });
  }
};

module.exports = { createGroup, getGroups, joinGroup, leaveGroup, getMembers, deleteGroup };
