import { supabase } from './supabase';

type EventType = 'ui' | 'auth' | 'error' | 'system';

export const logEvent = async (eventType: EventType, eventName: string, metadata: Record<string, unknown> = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('events').insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      event_name: eventName,
      metadata,
    });
  } catch {
    // Avoid crashing on analytics failures
  }
};

export const logError = async (error: unknown, context: Record<string, unknown> = {}) => {
  const message = error instanceof Error ? error.message : String(error);
  await logEvent('error', 'app_error', { message, ...context });
};
