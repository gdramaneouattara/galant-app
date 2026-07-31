const DEFAULT_MAX_WIDTH = 900;
const DEFAULT_QUALITY = 0.62;
const DEFAULT_TARGET_BYTES = 180 * 1024;
const MIN_QUALITY = 0.45;

const canvasToWebpBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to Blob conversion failed'));
      },
      'image/webp',
      quality
    );
  });
};

/**
 * Compresses an image on the client side using Canvas API.
 * Converts to WebP and retries with lower quality/size when the file is still large.
 */
export const compressImageWeb = async (
  file: File,
  maxWidth = DEFAULT_MAX_WIDTH,
  quality = DEFAULT_QUALITY,
  targetBytes = DEFAULT_TARGET_BYTES
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
      try {
        const img = new Image();
        img.onload = async () => {
          let workingMaxWidth = maxWidth;
          let workingQuality = quality;
          let bestBlob: Blob | null = null;

          for (let attempt = 0; attempt < 4; attempt += 1) {
            let width = img.width;
            let height = img.height;

            if (width > workingMaxWidth) {
              height = (workingMaxWidth / width) * height;
              width = workingMaxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

            const blob = await canvasToWebpBlob(canvas, workingQuality);
            bestBlob = blob;

            if (blob.size <= targetBytes || workingQuality <= MIN_QUALITY) break;
            workingQuality = Math.max(MIN_QUALITY, workingQuality - 0.08);
            workingMaxWidth = Math.max(720, Math.round(workingMaxWidth * 0.86));
          }

          if (bestBlob) resolve(bestBlob);
          else reject(new Error('Image compression failed'));
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = event.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
