const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGlobalMessages, getGroupMessages } = require('../controllers/messageController');

router.get('/global', protect, getGlobalMessages);
router.get('/group/:groupId', protect, getGroupMessages);

module.exports = router;
