import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1');
const normalizedTracesSampleRate = Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: !__DEV__,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: normalizedTracesSampleRate,
    attachStacktrace: true,
    sendDefaultPii: false,
    release: `${Constants.expoConfig?.slug || 'yamo-app'}@${Constants.expoConfig?.version || '0.0.0'}`,
    dist: Constants.expoConfig?.extra?.eas?.projectId || undefined,
  });
}

export { Sentry };
