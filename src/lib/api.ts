import { fbAuth } from './firebase';

// Helper pour détecter si on est sur le Web ou Mobile
const isWeb = typeof window !== 'undefined' && !((window as any).expo);

type ApiOptions = RequestInit & { requireAuth?: boolean };

const API_TIMEOUT_MS = 60000;

// Gestion des variables d'environnement selon la plateforme
const apiBaseUrl = isWeb
  ? (import.meta.env.VITE_API_BASE_URL || '')
  : (process.env.EXPO_PUBLIC_API_BASE_URL || '');

const normalizedApiBaseUrl = apiBaseUrl?.replace(/\/$/, '');

const getRuntimeApiBaseUrl = () => {
  if (!normalizedApiBaseUrl) return normalizedApiBaseUrl;

  // Si on est sur le Web, on évite tout accès à process.env ou Platform
  if (isWeb) return normalizedApiBaseUrl;

  // Sur Mobile (Android Emulator), localhost est à l'adresse 10.0.2.2
  // On vérifie l'existence de process de manière sécurisée
  const isAndroid = typeof process !== 'undefined' && process.env?.EXPO_OS === 'android';
  const isHermes = !!(global as any).HermesInternal;

  if (isAndroid || isHermes) {
    return normalizedApiBaseUrl
      .replace('://127.0.0.1', '://10.0.2.2')
      .replace('://localhost', '://10.0.2.2');
  }
  return normalizedApiBaseUrl;
};

export const apiRequest = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers || {});
  const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (resolvedTimeZone) headers.set('X-Timezone', resolvedTimeZone);

  if (options.requireAuth) {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('Unauthenticated');
    // Get fresh ID Token
    const token = await user.getIdToken(true);
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const runtimeApiBaseUrl = getRuntimeApiBaseUrl();
  if (!runtimeApiBaseUrl) throw new Error('EXPO_PUBLIC_API_BASE_URL is missing.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${runtimeApiBaseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: any = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
    }

    if (!response.ok) {
      const msg = payload?.error || payload?.message || 'API request failed';
      throw new Error(msg);
    }

    return payload as T;
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error('Délai d\'attente dépassé');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
