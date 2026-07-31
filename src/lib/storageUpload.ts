import { fbStorage } from './firebase';
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGE_MAX_WIDTH = 900;
const IMAGE_COMPRESSION_QUALITY = 0.62;

/**
 * Compresses an image before upload to reduce storage and bandwidth costs.
 */
export const compressImage = async (
  uri: string,
  maxWidth = IMAGE_MAX_WIDTH,
  quality = IMAGE_COMPRESSION_QUALITY
) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.WEBP }
    );
    return result.uri;
  } catch (error) {
    console.warn('Compression failed, using original image:', error);
    return uri;
  }
};

/**
 * Uploads a file to Firebase Storage with automatic compression for images.
 */
export const uploadArrayBufferToBucket = async ({
  bucket,
  path,
  uri,
  contentType,
}: {
  bucket: string;
  path: string;
  uri: string;
  contentType: string;
  upsert?: boolean;
}) => {
  const isImage = contentType.startsWith('image/');
  const finalUri = isImage ? await compressImage(uri) : uri;
  const reference = fbStorage.ref(`${bucket}/${path}`);

  try {
    // Quality requirement: fbStorage.ref(bucket).putFile
    const task = reference.putFile(finalUri, { contentType: isImage ? 'image/webp' : contentType });
    await task;
    return { success: true };
  } catch (error) {
    console.error('Firebase Storage Upload Error:', error);
    throw error;
  }
};

/**
 * Gets a public download URL for a stored file.
 */
export const getPublicUrl = async (bucket: string, path: string): Promise<string> => {
  try {
    return await fbStorage.ref(`${bucket}/${path}`).getDownloadURL();
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '';
  }
};

const suffixPath = (path: string, suffix: string) => {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return `${path}_${suffix}.webp`;
  return `${path.slice(0, dot)}_${suffix}.webp`;
};

export const uploadImageVariantsToBucket = async ({
  bucket,
  path,
  uri,
}: {
  bucket: string;
  path: string;
  uri: string;
}): Promise<{
  fullUrl: string;
  variants: { full: string; medium: string; thumb: string };
  paths: { full: string; medium: string; thumb: string };
}> => {
  const fullPath = path;
  const mediumPath = suffixPath(path, 'medium');
  const thumbPath = suffixPath(path, 'thumb');

  const fullUri = await compressImage(uri, 900, 0.62);
  const mediumUri = await compressImage(uri, 720, 0.58);
  const thumbUri = await compressImage(uri, 240, 0.54);

  await Promise.all([
    fbStorage.ref(`${bucket}/${fullPath}`).putFile(fullUri, { contentType: 'image/webp' }),
    fbStorage.ref(`${bucket}/${mediumPath}`).putFile(mediumUri, { contentType: 'image/webp' }),
    fbStorage.ref(`${bucket}/${thumbPath}`).putFile(thumbUri, { contentType: 'image/webp' }),
  ]);

  const [fullUrl, medium, thumb] = await Promise.all([
    getPublicUrl(bucket, fullPath),
    getPublicUrl(bucket, mediumPath),
    getPublicUrl(bucket, thumbPath),
  ]);

  return {
    fullUrl,
    variants: { full: fullUrl, medium, thumb },
    paths: {
      full: `${bucket}/${fullPath}`,
      medium: `${bucket}/${mediumPath}`,
      thumb: `${bucket}/${thumbPath}`,
    },
  };
};
