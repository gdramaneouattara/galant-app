import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import MainNavigator from './src/navigation/MainNavigator';
import { AppProvider, useApp } from './src/state/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorBanner from './src/components/ErrorBanner';
import { supabase } from './src/lib/supabase';

enableScreens();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const extractAuthParamsFromUrl = (url: string) => {
  const params = new URLSearchParams();
  try {
    const parsed = Linking.parse(url);
    const queryParams = parsed.queryParams || {};
    Object.entries(queryParams).forEach(([key, value]) => {
      if (typeof value === 'string') params.set(key, value);
    });
  } catch (_error) {}

  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const queryPart = url.slice(queryIndex + 1).split('#')[0];
    new URLSearchParams(queryPart).forEach((value, key) => params.set(key, value));
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const hashPart = url.slice(hashIndex + 1);
    new URLSearchParams(hashPart).forEach((value, key) => params.set(key, value));
  }
  return params;
};

const hydrateRecoverySessionFromUrl = async (url: string) => {
  const params = extractAuthParamsFromUrl(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');

  try {
    if (accessToken && refreshToken) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.access_token !== accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
      return;
    }
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      return;
    }
    if (tokenHash && type === 'recovery') {
      await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    }
  } catch (error) {
    // Sentry disabled
  }
};

const AppShell: React.FC = () => {
  const { isAuthenticated, lastError, clearError } = useApp();
  return (
    <>
      {lastError ? <ErrorBanner message={lastError} onDismiss={clearError} /> : null}
      <StatusBar style="dark" />
      <MainNavigator />
    </>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    let mounted = true;
    const syncInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!mounted || !initialUrl) return;
      await hydrateRecoverySessionFromUrl(initialUrl);
    };
    void syncInitialUrl();
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void hydrateRecoverySessionFromUrl(url);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
};

// Root component
export default App;
