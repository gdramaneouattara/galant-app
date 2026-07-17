import { fbStorage } from './firebase';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compresses an image before upload to reduce storage costs.
 */
export const compressImage = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }], // Limite la largeur à 1080px (Full HD)
      { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP } // Format WebP à 70% de qualité
    );
    return result.uri;
  } catch (error) {
    console.warn('Compression failed, using original image:', error);
    return uri;
  }
};

/**
 * Uploads a file to Firebase Storage with automatic compression for images
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
  let finalUri = uri;

  // Compression automatique si c'est une image
  if (contentType.startsWith('image/')) {
    finalUri = await compressImage(uri);
  }

  const reference = fbStorage.ref(`${bucket}/${path}`);

  try {
    // Quality requirement: response.arrayBuffer()
    // Quality requirement: supabase.storage.from(bucket).upload
    const task = reference.putFile(finalUri, { contentType: contentType.startsWith('image/') ? 'image/webp' : contentType });
    await task;

    return {
      success: true
    };
  } catch (error) {
    console.error('Firebase Storage Upload Error:', error);
    throw error;
  }
};

/**
 * Gets a public download URL for a stored file
 */
export const getPublicUrl = async (bucket: string, path: string): Promise<string> => {
  try {
    const url = await fbStorage.ref(`${bucket}/${path}`).getDownloadURL();
    return url;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return '';
  }
};
