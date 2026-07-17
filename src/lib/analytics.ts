import { db, fbAuth, COLLECTIONS } from './firebase';

type EventType = 'ui' | 'auth' | 'error' | 'system';

export const logEvent = async (eventType: EventType, eventName: string, metadata: Record<string, unknown> = {}) => {
  try {
    const user = fbAuth.currentUser;
    await db.collection('events').add({
      user_id: user?.uid ?? null,
      event_type: eventType,
      event_name: eventName,
      metadata,
      created_at: new Date().toISOString()
    });
  } catch {
    // Analytics is non-critical
  }
};

export const logError = async (error: unknown, context: Record<string, unknown> = {}) => {
  const message = error instanceof Error ? error.message : String(error);
  await logEvent('error', 'app_error', { message, ...context });
};
