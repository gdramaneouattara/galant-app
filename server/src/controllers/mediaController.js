const path = require('path');
const crypto = require('crypto');
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

const VIDEO_VALIDATION_ERRORS = new Set(['invalid_video_stream', 'invalid_video_duration', 'video_too_long']);

const createVideoValidationError = (message) => {
  const error = new Error(VIDEO_VALIDATION_ERRORS.has(message) ? message : 'invalid_video_duration');
  error.statusCode = 400;
  error.isVideoValidationError = true;
  return error;
};

const sanitizeVideoUploadError = (error) => {
  if (error?.isVideoValidationError || error?.statusCode === 400) {
    return VIDEO_VALIDATION_ERRORS.has(error.message) ? error.message : 'invalid_video_duration';
  }
  return 'video_upload_failed';
};

const getVideoMetadata = (inputPath) => (
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, metadata) => {
      if (error) return reject(error);
      resolve(metadata || {});
    });
  })
);

const validateOriginalVideo = async (inputPath, profile) => {
  const metadata = await getVideoMetadata(inputPath);
  const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  if (!videoStream) {
    throw createVideoValidationError('invalid_video_stream');
  }

  const duration = Number(metadata.format?.duration || videoStream.duration || 0);
  const hasFiniteDuration = Number.isFinite(duration) && duration > 0;
  if (hasFiniteDuration && duration > profile.maxDuration + 1) {
    throw createVideoValidationError('video_too_long');
  }

  return {
    duration: hasFiniteDuration ? duration : null,
    hasFiniteDuration,
    width: Number(videoStream.width || 0),
    height: Number(videoStream.height || 0)
  };
};

const validateCompressedVideo = async (inputPath, profile, { allowUnknownDuration = false } = {}) => {
  const metadata = await validateOriginalVideo(inputPath, profile);
  if (!metadata.hasFiniteDuration && !allowUnknownDuration) {
    throw createVideoValidationError('invalid_video_duration');
  }
  return metadata;
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
        '-map 0:v:0',
        '-map 0:a?',
        `-vf ${profile.scale}`,
        `-r ${profile.frameRate}`,
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-profile:v baseline',
        '-level 3.1',
        '-tag:v avc1',
        `-crf ${profile.crf}`,
        '-preset veryfast',
        '-bf 0',
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

const VIDEO_CONTENT_TYPE_BY_EXTENSION = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.3gp': 'video/3gpp',
  '.3gpp': 'video/3gpp',
};

const normalizeMimeType = (value = '') => String(value || '').toLowerCase().split(';')[0].trim();

const VIDEO_EXTENSION_BY_CONTENT_TYPE = {
  'video/mp4': '.mp4',
  'video/x-m4v': '.m4v',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/3gpp': '.3gp',
  'video/3gpp2': '.3gp',
};

const getSafeVideoExtension = (file = {}) => {
  const declaredType = normalizeMimeType(file.mimetype);
  if (VIDEO_EXTENSION_BY_CONTENT_TYPE[declaredType]) return VIDEO_EXTENSION_BY_CONTENT_TYPE[declaredType];
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (VIDEO_CONTENT_TYPE_BY_EXTENSION[ext]) return ext;
  return '.mp4';
};

const getSafeVideoContentType = (file = {}) => {
  const declaredType = normalizeMimeType(file.mimetype);
  if (VIDEO_EXTENSION_BY_CONTENT_TYPE[declaredType]) return declaredType;
  const ext = getSafeVideoExtension(file);
  return VIDEO_CONTENT_TYPE_BY_EXTENSION[ext] || 'video/mp4';
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
    const profile = isChat ? VIDEO_PROFILES.CHAT : VIDEO_PROFILES.STATUS;
    const originalMetadata = await validateOriginalVideo(inputPath, profile);
    const canUseOriginalFallback = originalMetadata.hasFiniteDuration;

    try {
      await compressVideo(inputPath, outputPath, isChat);
      await validateCompressedVideo(outputPath, profile, { allowUnknownDuration: true });
    } catch (error) {
      if (!canUseOriginalFallback) {
        if (error?.isVideoValidationError || error?.statusCode === 400) {
          throw createVideoValidationError(error.message);
        }
        throw error;
      }
      console.warn(`[media] video_compression_failed_using_original (type: ${req.body.type})`, error.message);
      videoPathToUpload = inputPath;
      videoFilename = `original_${stamp}${getSafeVideoExtension(req.file)}`;
      videoContentType = getSafeVideoContentType(req.file);
    }

    try {
      await createVideoThumbnail(videoPathToUpload, thumbnailPath);
    } catch (error) {
      console.warn('[media] video_thumbnail_failed_without_blocking_publish', error.message);
      thumbnailPathToUpload = null;
    }

    const destination = `${folder}/${req.user.id}/${videoFilename}`;
    const thumbnailDestination = thumbnailPathToUpload ? `${folder}/${req.user.id}/${thumbnailFilename}` : null;
    const shouldCreatePublicDownloadTokens = !isChat;
    const videoStorageMetadata = {
      contentType: videoContentType,
      cacheControl: 'public, max-age=31536000, immutable',
    };
    const thumbnailStorageMetadata = {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    };

    if (shouldCreatePublicDownloadTokens) {
      videoStorageMetadata.metadata = {
        firebaseStorageDownloadTokens: crypto.randomUUID(),
      };
      thumbnailStorageMetadata.metadata = {
        firebaseStorageDownloadTokens: crypto.randomUUID(),
      };
    }

    await bucket.upload(videoPathToUpload, {
      destination,
      metadata: videoStorageMetadata
    });

    if (thumbnailDestination) {
      await bucket.upload(thumbnailPathToUpload, {
        destination: thumbnailDestination,
        metadata: thumbnailStorageMetadata
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
    const statusCode = error.statusCode || 500;
    const safeError = sanitizeVideoUploadError(error);
    res.status(statusCode).json({ error: safeError });
  }
};

module.exports = { uploadCompressedVideo };
