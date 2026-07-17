import { Alert } from 'react-native';

/**
 * Affiche une alerte native sur mobile
 */
export const showAlert = (title: string, message: string) => {
  Alert.alert(title, message);
};
