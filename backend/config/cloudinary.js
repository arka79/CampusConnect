const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memoryStorage — we pipe the buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Only PDF, Word, PowerPoint, and images.'));
  },
});

/**
 * Upload a buffer to Cloudinary and return { secure_url, public_id, bytes }
 */
const uploadToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    const ext   = originalName.split('.').pop().toLowerCase();
    const isRaw = ['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(ext);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'adamas_university',
        resource_type: isRaw ? 'raw' : 'image',
        use_filename:  true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Delete a file from Cloudinary.
 * resource_type must match what was used during upload.
 */
const deleteFromCloudinary = async (publicId, originalName = '') => {
  const ext   = (originalName || publicId).split('.').pop().toLowerCase();
  const isRaw = ['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(ext);
  return cloudinary.uploader.destroy(publicId, {
    resource_type: isRaw ? 'raw' : 'image',
  });
};

module.exports = { cloudinary, upload, uploadToCloudinary, deleteFromCloudinary };
