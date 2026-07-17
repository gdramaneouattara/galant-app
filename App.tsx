import 'react-native-gesture-handler';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import MainNavigator from './src/navigation/MainNavigator';
import { AppProvider, useApp } from './src/state/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorBanner from './src/components/ErrorBanner';
import { Sentry } from './src/lib/sentry';

enableScreens();
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AppShell: React.FC = () => {
  const { lastError, clearError } = useApp();
  return (
    <>
      {lastError ? <ErrorBanner message={lastError} onDismiss={clearError} /> : null}
      <StatusBar style="dark" />
      <MainNavigator />
    </>
  );
};

const App: React.FC = () => {
  const [fontsLoaded] = useFonts({
    'Playfair': PlayfairDisplay_700Bold,
    'PlayfairBlack': PlayfairDisplay_900Black,
    'Inter': Inter_400Regular,
    'InterSemiBold': Inter_600SemiBold,
    'InterBold': Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <AppProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <AppShell />
        </View>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default Sentry.wrap(App);
