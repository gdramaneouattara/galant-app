export const safeGoBack = (navigation: any, fallbackRoute: string = 'MainTabs', fallbackParams?: any) => {
  if (typeof navigation?.canGoBack === 'function' && navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  navigation.navigate(fallbackRoute as never, fallbackParams as never);
};
