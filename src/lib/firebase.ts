import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

/**
 * Firebase Services for Galant
 */

export const fbAuth = auth();
export const db = firestore();
export const rtdb = database();
export const fbStorage = storage();
export const fbMessaging = messaging();

// Collection names constants
export const COLLECTIONS = {
  PROFILES: 'profiles',
  VENUES: 'venues',
  MATCHES: 'matches',
  REPORTS: 'reports',
  KYC: 'kyc_requests',
  NOTIFICATIONS: 'notifications',
  SUBSCRIPTIONS: 'subscriptions',
  STORIES: 'stories'
};

export default {
  auth,
  firestore,
  database,
  storage
};
