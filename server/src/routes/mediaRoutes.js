const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { uploadCompressedVideo } = require('../controllers/mediaController');

const path = require('path');
const upload = multer({ dest: path.join(__dirname, '../../uploads/') }); // Chemin absolu vers le dossier temporaire

router.post('/upload-video', requireAuth, upload.single('video'), uploadCompressedVideo);

module.exports = router;
