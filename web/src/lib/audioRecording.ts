/**
 * Audio Recording utility for Galant Web.
 * Uses MediaRecorder API to capture voice serenades.
 */

export const startRecording = async (): Promise<{ recorder: MediaRecorder, stream: MediaStream }> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('micro_not_supported');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Choose supported mime type
  const mimeType = MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

  const recorder = new MediaRecorder(stream, { mimeType });
  return { recorder, stream };
};

export const stopRecording = (recorder: MediaRecorder, stream: MediaStream): Promise<Blob> => {
  return new Promise((resolve) => {
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      stream.getTracks().forEach(track => track.stop());
      resolve(blob);
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  });
};
