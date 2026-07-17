import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android.config,
        googleMaps: {
          // Lit la clé depuis .env.local en local ou depuis les secrets EAS en production
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
  };
};
