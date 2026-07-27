import { AppState, AppStateStatus } from 'react-native';
import database, { FirebaseDatabaseTypes } from '@react-native-firebase/database';
import { rtdb } from './firebase';

export type PresenceState = 'online' | 'offline';

export type PresenceInfo = {
  state: PresenceState;
  is_online: boolean;
  last_changed?: number | null;
};

const CONNECTED_PATH = '.info/connected';
const PRESENCE_PATH = 'presence/users';

const buildPresencePayload = (state: PresenceState) => ({
  state,
  is_online: state === 'online',
  last_changed: database.ServerValue.TIMESTAMP,
});

export const getUserPresenceRef = (userId: string) => rtdb.ref(`${PRESENCE_PATH}/${userId}`);

export const markUserPresenceOnline = async (userId: string) => {
  const userStatusRef = getUserPresenceRef(userId);
  await userStatusRef.onDisconnect().set(buildPresencePayload('offline'));
  await userStatusRef.set(buildPresencePayload('online'));
};

export const markUserPresenceOffline = async (userId: string) => {
  const userStatusRef = getUserPresenceRef(userId);
  await userStatusRef.onDisconnect().cancel();
  await userStatusRef.set(buildPresencePayload('offline'));
};

export const startRealtimePresence = (userId: string) => {
  let currentAppState: AppStateStatus = AppState.currentState;
  const connectedRef = rtdb.ref(CONNECTED_PATH);

  const setOnlineWhenActive = async () => {
    if (currentAppState !== 'active') return;
    try {
      await markUserPresenceOnline(userId);
    } catch (error) {
      console.error('Presence online update failed:', error);
    }
  };

  const connectedListener = connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === true) {
      void setOnlineWhenActive();
    }
  });

  const appStateSubscription = AppState.addEventListener('change', (nextState) => {
    const wasActive = currentAppState === 'active';
    currentAppState = nextState;

    if (nextState === 'active') {
      void setOnlineWhenActive();
      return;
    }

    if (wasActive) {
      void markUserPresenceOffline(userId).catch((error) => {
        console.error('Presence offline update failed:', error);
      });
    }
  });

  return () => {
    appStateSubscription.remove();
    connectedRef.off('value', connectedListener);
    void markUserPresenceOffline(userId).catch((error) => {
      console.error('Presence cleanup failed:', error);
    });
  };
};

export const subscribeToUserPresence = (
  userId: string,
  onChange: (presence: PresenceInfo) => void
) => {
  const userStatusRef = getUserPresenceRef(userId);
  const listener = userStatusRef.on('value', (snapshot: FirebaseDatabaseTypes.DataSnapshot) => {
    const value = snapshot.val();
    onChange({
      state: value?.state === 'online' || value?.is_online === true ? 'online' : 'offline',
      is_online: value?.state === 'online' || value?.is_online === true,
      last_changed: typeof value?.last_changed === 'number' ? value.last_changed : null,
    });
  });

  return () => userStatusRef.off('value', listener);
};
