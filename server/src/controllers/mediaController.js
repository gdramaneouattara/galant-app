const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { bucket } = require('../config/firebase');

// Configure ffmpeg to use the static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

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

  try {
    // 1. Compress
    await compressVideo(inputPath, outputPath, isChat);
    await createVideoThumbnail(outputPath, thumbnailPath);

    // 2. Upload to Firebase Storage
    const destination = `${folder}/${req.user.id}/${outputFilename}`;
    const thumbnailDestination = `${folder}/${req.user.id}/${thumbnailFilename}`;

    await bucket.upload(outputPath, {
      destination,
      metadata: {
        contentType: 'video/mp4',
      }
    });

    await bucket.upload(thumbnailPath, {
      destination: thumbnailDestination,
      metadata: {
        contentType: 'image/jpeg',
      }
    });

    // 3. Clean up
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);

    res.json({
      success: true,
      mediaUrl: `${req.user.id}/${outputFilename}`,
      thumbnailUrl: `${req.user.id}/${thumbnailFilename}`
    });

  } catch (error) {
    console.error('Video processing error:', error);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    res.status(500).json({ error: 'Failed to process video' });
  }
};

module.exports = { uploadCompressedVideo };
