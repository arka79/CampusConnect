const { pool } = require('../config/db');

// ✅ GET /api/messages/global?page=1
const getGlobalMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT m.*, 
              u.name AS sender_name, 
              u.avatar_url AS sender_avatar, 
              u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.is_global = TRUE
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    console.log("📩 Global messages fetched:", rows.length); // ✅ DEBUG

    res.json({ messages: rows.reverse() });
  } catch (err) {
    console.error("❌ Global fetch error:", err);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

// ✅ GET /api/messages/group/:groupId
const getGroupMessages = async (req, res) => {
  try {
    // ✅ Verify membership
    const { rows: membership } = await pool.query(
      `SELECT id 
       FROM group_members 
       WHERE group_id = $1 AND user_id = $2`,
      [req.params.groupId, req.user.id]
    );

    if (!membership.length && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT m.*, 
              u.name AS sender_name, 
              u.avatar_url AS sender_avatar, 
              u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.group_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.groupId, limit, offset]
    );

    res.json({ messages: rows.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching group messages' });
  }
};

module.exports = {
  getGlobalMessages,
  getGroupMessages,
};