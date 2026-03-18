const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createGroup, getGroups, joinGroup, leaveGroup, getMembers, deleteGroup
} = require('../controllers/groupController');

router.get('/', protect, getGroups);
router.post('/', protect, createGroup);
router.post('/:id/join', protect, joinGroup);
router.delete('/:id/leave', protect, leaveGroup);
router.get('/:id/members', protect, getMembers);
router.delete('/:id', protect, deleteGroup);

module.exports = router;
