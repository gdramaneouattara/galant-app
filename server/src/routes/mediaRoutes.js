const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { uploadCompressedVideo } = require('../controllers/mediaController');

const path = require('path');
const os = require('os');
const fs = require('fs');
const MAX_VIDEO_UPLOAD_BYTES = 30 * 1024 * 1024;
const VIDEO_UPLOAD_TMP_DIR = path.join(os.tmpdir(), 'galant-video-uploads');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm', '.avi', '.mkv', '.3gp']);
const VIDEO_FALLBACK_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'application/mp4',
  'application/x-mp4',
  'application/ogg',
]);
fs.mkdirSync(VIDEO_UPLOAD_TMP_DIR, { recursive: true });

const isAcceptedVideoUpload = (file = {}) => {
  const mimetype = String(file.mimetype || '').toLowerCase();
  if (mimetype.startsWith('video/')) return true;

  const ext = path.extname(file.originalname || '').toLowerCase();
  return VIDEO_EXTENSIONS.has(ext) && VIDEO_FALLBACK_MIME_TYPES.has(mimetype);
};

const upload = multer({
  dest: VIDEO_UPLOAD_TMP_DIR,
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!isAcceptedVideoUpload(file)) {
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
