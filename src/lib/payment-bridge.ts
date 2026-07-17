import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export const openPaymentUrl = async (url: string) => {
  const redirectUrl = Linking.createURL('paystack');
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
  return result.type === 'success';
};
