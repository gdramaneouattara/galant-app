import { supabase } from './supabase';
import { Platform } from 'react-native';

type ApiOptions = RequestInit & { requireAuth?: boolean };

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const normalizedApiBaseUrl = apiBaseUrl?.replace(/\/$/, '');

const getRuntimeApiBaseUrl = () => {
  if (!normalizedApiBaseUrl) return normalizedApiBaseUrl;

  // Android emulators cannot access the host machine via localhost/127.0.0.1.
  if (Platform.OS === 'android') {
    return normalizedApiBaseUrl
      .replace('://127.0.0.1', '://10.0.2.2')
      .replace('://localhost', '://10.0.2.2');
  }

  return normalizedApiBaseUrl;
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers || {});

  if (options.requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Missing auth token');
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const runtimeApiBaseUrl = getRuntimeApiBaseUrl();
  if (!runtimeApiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is missing.');
  }
  const response = await fetch(`${runtimeApiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const errorMessage =
      payload?.error ||
      payload?.message ||
      (typeof payload?.raw === 'string' ? payload.raw.slice(0, 200) : null) ||
      'API request failed';
    throw new Error(errorMessage);
  }

  return payload as T;
};
