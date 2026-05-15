import Constants from 'expo-constants';

const executionEnvironment = String((Constants as any)?.executionEnvironment || '');
const appOwnership = String((Constants as any)?.appOwnership || '');

export const isExpoGo = executionEnvironment === 'storeClient' || appOwnership === 'expo';

export const IAP_EXPO_GO_MESSAGE =
  "Google Play / App Store n'est pas disponible dans Expo Go. Utilisez Mobile Money (Paystack) ou un build natif.";
