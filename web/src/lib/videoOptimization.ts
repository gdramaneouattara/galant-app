export const VIDEO_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;
export const STORY_VIDEO_MAX_DURATION_SECONDS = 15;
export const CHAT_VIDEO_MAX_DURATION_SECONDS = 30;

const VIDEO_LONG_SIDE = 960;
const VIDEO_SHORT_SIDE = 540;
const STORY_TARGET_BYTES = 8 * 1024 * 1024;
const CHAT_TARGET_BYTES = 12 * 1024 * 1024;

type VideoValidation = {
  duration: number;
  width: number;
  height: number;
};

const loadVideoMetadata = (file: File): Promise<VideoValidation> => (
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      };
      URL.revokeObjectURL(objectUrl);
      resolve(metadata);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('invalid_video'));
    };
    video.src = objectUrl;
  })
);

export const validateVideoFileWeb = async (file: File, maxDurationSeconds: number) => {
  if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
    throw new Error('video_too_large');
  }

  const metadata = await loadVideoMetadata(file);
  if (!metadata.duration || metadata.duration > maxDurationSeconds + 1) {
    throw new Error('video_too_long');
  }

  return metadata;
};

const getRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || null;
};

const fitVideoSize = (width: number, height: number) => {
  if (!width || !height) return { width: VIDEO_SHORT_SIDE, height: VIDEO_LONG_SIDE };
  const isPortrait = height >= width;
  const maxWidth = isPortrait ? VIDEO_SHORT_SIDE : VIDEO_LONG_SIDE;
  const maxHeight = isPortrait ? VIDEO_LONG_SIDE : VIDEO_SHORT_SIDE;
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(2, Math.round((width * ratio) / 2) * 2),
    height: Math.max(2, Math.round((height * ratio) / 2) * 2),
  };
};

export const compressVideoWeb = async (
  file: File,
  options: { maxDurationSeconds: number; kind: 'STORY' | 'CHAT' }
): Promise<File> => {
  const recorderMimeType = getRecorderMimeType();
  if (!recorderMimeType) return file;

  let metadata: VideoValidation;
  try {
    metadata = await validateVideoFileWeb(file, options.maxDurationSeconds);
  } catch (error: any) {
    if (error?.message === 'video_too_large' || error?.message === 'video_too_long') {
      throw error;
    }
    return file;
  }

  const targetBytes = options.kind === 'STORY' ? STORY_TARGET_BYTES : CHAT_TARGET_BYTES;
  if (file.size <= targetBytes && metadata.width <= VIDEO_LONG_SIDE && metadata.height <= VIDEO_LONG_SIDE) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.captureStream) {
    URL.revokeObjectURL(objectUrl);
    return file;
  }

  const fitted = fitVideoSize(metadata.width, metadata.height);
  canvas.width = fitted.width;
  canvas.height = fitted.height;
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('invalid_video'));
  });

  const canvasStream = canvas.captureStream(24);
  let audioContext: AudioContext | null = null;
  let audioAttached = false;

  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextCtor) {
      audioContext = new AudioContextCtor();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      destination.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      await audioContext.resume();
      audioAttached = destination.stream.getAudioTracks().length > 0;
    }
  } catch {
    audioContext = null;
  }

  if (!audioAttached) {
    canvasStream.getTracks().forEach((track) => track.stop());
    if (audioContext) void audioContext.close();
    URL.revokeObjectURL(objectUrl);
    return file;
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: recorderMimeType,
    videoBitsPerSecond: options.kind === 'STORY' ? 850_000 : 1_000_000,
    audioBitsPerSecond: 64_000,
  });

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('video_compression_failed'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorderMimeType }));
  });

  let frameId = 0;
  const drawFrame = () => {
    if (!video.paused && !video.ended) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frameId = requestAnimationFrame(drawFrame);
    }
  };

  try {
    recorder.start(1000);
    await video.play();
    drawFrame();
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
      window.setTimeout(resolve, (options.maxDurationSeconds + 1) * 1000);
    });
    if (recorder.state !== 'inactive') recorder.stop();
    const compressed = await stopped;
    const extension = recorderMimeType.includes('webm') ? 'webm' : 'mp4';
    const optimized = new File([compressed], file.name.replace(/\.[^.]+$/, `.${extension}`), { type: compressed.type });
    return optimized.size > 0 && optimized.size < file.size && optimized.size <= VIDEO_UPLOAD_MAX_BYTES ? optimized : file;
  } catch {
    if (recorder.state !== 'inactive') recorder.stop();
    return file;
  } finally {
    cancelAnimationFrame(frameId);
    video.pause();
    canvasStream.getTracks().forEach((track) => track.stop());
    if (audioContext) void audioContext.close();
    URL.revokeObjectURL(objectUrl);
  }
};
