const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const configureFfmpeg = () => {
  const ffmpegPath = process.env.FFMPEG_PATH || (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : null);
  if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  return ffmpeg;
};

module.exports = { configureFfmpeg };
