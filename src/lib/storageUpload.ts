import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const readFileAsArrayBuffer = async (uri: string) => {
  if (uri.startsWith('data:')) {
    const [, base64Payload] = uri.split(',', 2);
    if (!base64Payload) {
      throw new Error('Impossible de lire le fichier local (data URI invalide)');
    }

    return decode(base64Payload);
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Impossible de lire le fichier local (${response.status})`);
  }

  return response.arrayBuffer();
};

export const uploadArrayBufferToBucket = async ({
  bucket,
  path,
  uri,
  contentType,
  upsert = false,
}: {
  bucket: string;
  path: string;
  uri: string;
  contentType: string;
  upsert?: boolean;
}) => {
  const fileBuffer = await readFileAsArrayBuffer(uri);

  const { error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
    contentType,
    upsert,
  });

  if (error) throw error;

  return {
    bytes: fileBuffer.byteLength,
  };
};
