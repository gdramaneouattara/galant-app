const path = require('path');
const fs = require('fs');
const { bucket } = require('../config/firebase');
const { configureFfmpeg } = require('../utils/ffmpegBinary');

const ffmpeg = configureFfmpeg();

const VIDEO_PROFILES = {
  STATUS: {
    maxDuration: 15,
    scale: 'scale=-2:540',
    crf: 28,
    audioBitrate: '64k',
    frameRate: 24,
  },
  CHAT: {
    maxDuration: 30,
    scale: 'scale=-2:540',
    crf: 30,
    audioBitrate: '64k',
    frameRate: 24,
  },
};

/**
 * Compresses a video for Chat/Stories.
 * Stories: 15s, Chat: 30s
 */
const compressVideo = (inputPath, outputPath, isChat = false) => {
  const profile = isChat ? VIDEO_PROFILES.CHAT : VIDEO_PROFILES.STATUS;
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .duration(profile.maxDuration)
      .outputOptions([
        `-vf ${profile.scale}`,
        `-r ${profile.frameRate}`,
        '-c:v libx264',
        `-crf ${profile.crf}`,
        '-preset veryfast',
        '-c:a aac',
        `-b:a ${profile.audioBitrate}`,
        '-movflags +faststart'
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

const createVideoThumbnail = (inputPath, outputPath) => (
  new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-frames:v 1',
        '-vf scale=-2:360',
        '-q:v 8'
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  })
);

const cleanupFiles = (...paths) => {
  [...new Set(paths.filter(Boolean))].forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
      console.warn('[media] temp_cleanup_failed', error.message);
    }
  });
};

const getSafeVideoExtension = (file = {}) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (['.mp4', '.mov', '.m4v', '.webm'].includes(ext)) return ext;
  if (String(file.mimetype || '').includes('webm')) return '.webm';
  if (String(file.mimetype || '').includes('quicktime')) return '.mov';
  return '.mp4';
};

const uploadCompressedVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isChat = req.body.type === 'CHAT';
  const inputPath = req.file.path;
  const stamp = Date.now();
  const outputFilename = `compressed_${stamp}.mp4`;
  const thumbnailFilename = `thumb_${stamp}.jpg`;
  const folder = isChat ? 'chat-media' : 'statuses';
  const outputPath = path.join(path.dirname(inputPath), outputFilename);
  const thumbnailPath = path.join(path.dirname(inputPath), thumbnailFilename);
  let videoPathToUpload = outputPath;
  let videoFilename = outputFilename;
  let videoContentType = 'video/mp4';
  let thumbnailPathToUpload = thumbnailPath;

  try {
    try {
      await compressVideo(inputPath, outputPath, isChat);
    } catch (error) {
      console.warn('[media] video_compression_failed_using_original', error.message);
      videoPathToUpload = inputPath;
      videoFilename = `original_${stamp}${getSafeVideoExtension(req.file)}`;
      videoContentType = req.file.mimetype || 'video/mp4';
    }

    try {
      await createVideoThumbnail(videoPathToUpload, thumbnailPath);
    } catch (error) {
      console.warn('[media] video_thumbnail_failed_without_blocking_publish', error.message);
      thumbnailPathToUpload = null;
    }

    const destination = `${folder}/${req.user.id}/${videoFilename}`;
    const thumbnailDestination = thumbnailPathToUpload ? `${folder}/${req.user.id}/${thumbnailFilename}` : null;

    await bucket.upload(videoPathToUpload, {
      destination,
      metadata: {
        contentType: videoContentType,
        cacheControl: 'public, max-age=31536000, immutable',
      }
    });

    if (thumbnailDestination) {
      await bucket.upload(thumbnailPathToUpload, {
        destination: thumbnailDestination,
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable',
        }
      });
    }

    cleanupFiles(inputPath, outputPath, thumbnailPath);

    res.json({
      success: true,
      mediaUrl: `${req.user.id}/${videoFilename}`,
      thumbnailUrl: thumbnailDestination ? `${req.user.id}/${thumbnailFilename}` : null
    });

  } catch (error) {
    console.error('Video processing error:', error);
    cleanupFiles(inputPath, outputPath, thumbnailPath);
    res.status(500).json({ error: 'video_upload_failed' });
  }
};

module.exports = { uploadCompressedVideo };
