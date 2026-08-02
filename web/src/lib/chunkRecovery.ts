const RECOVERY_KEY = 'galant_chunk_recovery_at';
const RECOVERY_WINDOW_MS = 30000;
const PRESERVED_RUNTIME_CACHES = ['galant-media-cache', 'galant-remote-image-cache'];

const messageFromReason = (reason: unknown) => {
  if (!reason) return '';
  if (typeof reason === 'string') return reason;
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  if (typeof reason === 'object' && 'message' in reason) return String((reason as { message?: unknown }).message || '');
  return String(reason);
};

export const isDynamicImportFailure = (reason: unknown) => {
  const message = messageFromReason(reason).toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk')
  );
};

const clearBuildCaches = async () => {
  if (!('caches' in window)) return;
  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => !PRESERVED_RUNTIME_CACHES.includes(name))
      .map((name) => window.caches.delete(name))
  );
};

const updateServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
};

const recoverFromDynamicImportFailure = async () => {
  const lastAttempt = Number(sessionStorage.getItem(RECOVERY_KEY) || 0);
  if (Date.now() - lastAttempt < RECOVERY_WINDOW_MS) return;

  sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  await Promise.allSettled([clearBuildCaches(), updateServiceWorkers()]);
  window.location.reload();
};

export const installChunkRecovery = () => {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    void recoverFromDynamicImportFailure();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!isDynamicImportFailure(event.reason)) return;
    event.preventDefault();
    void recoverFromDynamicImportFailure();
  });

  window.addEventListener('error', (event) => {
    if (!isDynamicImportFailure(event.error || event.message)) return;
    event.preventDefault();
    void recoverFromDynamicImportFailure();
  });
};
