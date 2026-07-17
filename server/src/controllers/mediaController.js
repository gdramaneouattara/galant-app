const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { bucket } = require('../config/firebase');

// Configure ffmpeg to use the static binary
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Compresses a video for Chat/Stories.
 * Stories: 15s, Chat: 30s
 */
const compressVideo = (inputPath, outputPath, isChat = false) => {
  const maxDuration = isChat ? 30 : 15;
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .duration(maxDuration)
      .outputOptions([
        '-vf scale=-2:720',
        '-r 30',
        '-c:v libx264',
        '-crf 23',
        '-preset veryfast',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart'
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

const uploadCompressedVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isChat = req.body.type === 'CHAT';
  const inputPath = req.file.path;
  const outputFilename = `compressed_${Date.now()}.mp4`;
  const folder = isChat ? 'chat-media' : 'statuses';
  const outputPath = path.join(path.dirname(inputPath), outputFilename);

  try {
    // 1. Compress
    await compressVideo(inputPath, outputPath, isChat);

    // 2. Upload to Firebase Storage
    const destination = `${folder}/${req.user.id}/${outputFilename}`;

    await bucket.upload(outputPath, {
      destination,
      metadata: {
        contentType: 'video/mp4',
      }
    });

    // 3. Clean up
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    res.json({
      success: true,
      mediaUrl: `${req.user.id}/${outputFilename}`
    });

  } catch (error) {
    console.error('Video processing error:', error);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    res.status(500).json({ error: 'Failed to process video' });
  }
};

module.exports = { uploadCompressedVideo };
