import { supabase } from './supabase';

type ApiOptions = RequestInit & { requireAuth?: boolean };

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const normalizedApiBaseUrl = apiBaseUrl?.replace(/\/$/, '');

if (!normalizedApiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_BASE_URL is missing.');
}

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

  const response = await fetch(`${normalizedApiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMessage = payload?.error || payload?.message || 'API request failed';
    throw new Error(errorMessage);
  }

  return payload as T;
};
