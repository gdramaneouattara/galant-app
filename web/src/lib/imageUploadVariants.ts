import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fbStorage } from '../firebase';
import { compressImageWeb } from './imageCompression';

type ImageVariantUpload = {
  full: string;
  medium: string;
  thumb: string;
};

type ImageVariantPaths = {
  full: string;
  medium: string;
  thumb: string;
};

const suffixPath = (path: string, suffix: string) => {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return `${path}_${suffix}.webp`;
  return `${path.slice(0, dot)}_${suffix}.webp`;
};

export const uploadImageVariantsWeb = async (
  file: File,
  storagePath: string
): Promise<{ fullUrl: string; variants: ImageVariantUpload; paths: ImageVariantPaths }> => {
  const fullBlob = await compressImageWeb(file, 900, 0.62, 180 * 1024);
  const mediumBlob = await compressImageWeb(file, 720, 0.58, 120 * 1024);
  const thumbBlob = await compressImageWeb(file, 240, 0.54, 28 * 1024);

  const fullRef = ref(fbStorage, storagePath);
  const mediumPath = suffixPath(storagePath, 'medium');
  const thumbPath = suffixPath(storagePath, 'thumb');
  const mediumRef = ref(fbStorage, mediumPath);
  const thumbRef = ref(fbStorage, thumbPath);

  await Promise.all([
    uploadBytes(fullRef, fullBlob, { contentType: 'image/webp' }),
    uploadBytes(mediumRef, mediumBlob, { contentType: 'image/webp' }),
    uploadBytes(thumbRef, thumbBlob, { contentType: 'image/webp' }),
  ]);

  const [fullUrl, medium, thumb] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(mediumRef),
    getDownloadURL(thumbRef),
  ]);

  return {
    fullUrl,
    variants: { full: fullUrl, medium, thumb },
    paths: { full: storagePath, medium: mediumPath, thumb: thumbPath },
  };
};
