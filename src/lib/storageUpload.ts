import { fbStorage } from './firebase';
import * as ImageManipulator from 'expo-image-manipulator';

const IMAGE_MAX_WIDTH = 900;
const IMAGE_COMPRESSION_QUALITY = 0.62;

/**
 * Compresses an image before upload to reduce storage and bandwidth costs.
 */
export const compressImage = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_MAX_WIDTH } }],
      { compress: IMAGE_COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.WEBP }
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
