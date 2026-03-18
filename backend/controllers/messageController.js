const { pool } = require('../config/db');

// GET /api/messages/global?page=1
const getGlobalMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const [messages] = await pool.query(`
      SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE m.is_global = 1 ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `, [limit, offset]);
    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

// GET /api/messages/group/:groupId
const getGroupMessages = async (req, res) => {
  try {
    // Verify membership
    const [membership] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.groupId, req.user.id]
    );
    if (!membership.length && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not a member of this group' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const [messages] = await pool.query(`
      SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ? ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `, [req.params.groupId, limit, offset]);
    res.json({ messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching group messages' });
  }
};

module.exports = { getGlobalMessages, getGroupMessages };
