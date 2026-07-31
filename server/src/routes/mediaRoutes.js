const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { uploadCompressedVideo } = require('../controllers/mediaController');

const path = require('path');
const MAX_VIDEO_UPLOAD_BYTES = 30 * 1024 * 1024;
const upload = multer({
  dest: path.join(__dirname, '../../uploads/'), // Chemin absolu vers le dossier temporaire
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!String(file.mimetype || '').startsWith('video/')) {
      return cb(new Error('invalid_video_type'));
    }
    cb(null, true);
  }
});

const uploadSingleVideo = (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'video_too_large', maxBytes: MAX_VIDEO_UPLOAD_BYTES });
    }
    return res.status(400).json({ error: err.message || 'invalid_video_upload' });
  });
};

router.post('/upload-video', requireAuth, uploadSingleVideo, uploadCompressedVideo);

module.exports = router;
