const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getStats, getUsers, updateUser, deleteUser, createUser,
  createAnnouncement, getAnnouncements, deleteAnnouncement
} = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/announcements', getAnnouncements);
router.post('/announcements', createAnnouncement);
router.delete('/announcements/:id', deleteAnnouncement);

module.exports = router;
