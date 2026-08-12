const ffmpeg = require('fluent-ffmpeg');

const configureFfmpeg = () => {
  const ffmpegPath = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
  ffmpeg.setFfmpegPath(ffmpegPath);
  return ffmpeg;
};

module.exports = { configureFfmpeg };
