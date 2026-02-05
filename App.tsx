import 'react-native-gesture-handler';
import React from 'react';
import { enableScreens } from 'react-native-screens';
import { StatusBar } from 'expo-status-bar';
import MainNavigator from './src/navigation/MainNavigator';
import { AppProvider, useApp } from './src/state/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorBanner from './src/components/ErrorBanner';

enableScreens();

const AppShell: React.FC = () => {
  const { isAuthenticated, lastError, clearError } = useApp();
  return (
    <>
      {lastError ? <ErrorBanner message={lastError} onDismiss={clearError} /> : null}
      <StatusBar style="dark" />
      <MainNavigator isAuthenticated={isAuthenticated} />
    </>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppProvider>
      <AppShell />
    </AppProvider>
  </ErrorBoundary>
);

export default App;
