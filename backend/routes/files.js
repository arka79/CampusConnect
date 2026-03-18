const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  uploadFile, getFiles, getPendingFiles, approveFile, deleteFile, incrementDownload
} = require('../controllers/fileController');

router.get('/', protect, getFiles);
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/pending', protect, adminOnly, getPendingFiles);
router.put('/:id/approve', protect, adminOnly, approveFile);
router.post('/:id/download', protect, incrementDownload);
router.delete('/:id', protect, deleteFile);

module.exports = router;
