
import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, useColorScheme, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { fbAuth, db, rtdb, fbMessaging, COLLECTIONS } from '../lib/firebase';
import { Gender, Message, Match, User, AppThemePreference, Language } from '../types';
import { apiRequest } from '../lib/api';
import { THEMES } from '../data/mock';
import { TRANSLATIONS } from '../translations';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

const THEME_STORAGE_KEY = '@galant_theme_pref';
const LANG_STORAGE_KEY = '@galant_lang_pref';

const INVISIBLE_MODE_ELIGIBLE_PLANS = new Set(['MONTHLY', 'QUARTERLY']);
const TRIAL_DAYS = 7;
const APP_RESUME_REFRESH_COOLDOWN_MS = 3000;

const isMaleTrialActiveFromProfile = (profile: any): boolean => {
  if (!profile || String(profile.gender || '').toUpperCase() !== 'MALE' || profile.is_premium) return false;
  if (!profile.trial_started_at) return false;
  const startedAt = new Date(profile.trial_started_at).getTime();
  if (!Number.isFinite(startedAt)) return false;
  const trialEnd = startedAt + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < trialEnd;
};

type AppContextValue = {
  isAuthenticated: boolean;
  currentUser: User | null;
  fbUser: FirebaseAuthTypes.User | null;
  users: User[];
  matches: Match[];
  messages: Message[];
  appResumeVersion: number;
  lastError: string | null;
  clearError: () => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  addMatch: (match: Match) => void;
  addMessage: (message: Message) => void;
  refreshMatches: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshCurrentUser: (userId?: string) => Promise<User | null>;
  toggleInvisibleMode: (enabled: boolean) => Promise<boolean>;
  toggleUserVerification: (userId: string) => void;
  suspendUser: (userId: string) => void;
  activateBoost: () => Promise<string | null>;
  markMessagesAsRead: (matchId: string) => Promise<void>;
  theme: AppThemePreference;
  setThemePreference: (pref: AppThemePreference) => void;
  activeTheme: 'light' | 'dark';
  colors: typeof THEMES.light;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS.fr, params?: Record<string, any>) => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [appResumeVersion, setAppResumeVersion] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pushTokenRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const resumeRefreshInFlightRef = useRef(false);
  const lastResumeRefreshAtRef = useRef(0);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const [themePreference, setThemePreference] = useState<AppThemePreference>('system');
  const [language, setLanguageState] = useState<Language>('fr');
  const systemColorScheme = useColorScheme();

  const activeTheme = useMemo((): 'light' | 'dark' => {
    if (themePreference === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themePreference;
  }, [themePreference, systemColorScheme]);

  const colors = useMemo(() => THEMES[activeTheme], [activeTheme]);

  const t = (key: keyof typeof TRANSLATIONS.fr, params?: Record<string, any>) => {
    let str = TRANSLATIONS[language][key] || key;
    if (params) {
      Object.keys(params).forEach(p => {
        str = str.replace(`{${p}}`, params[p]);
      });
    }
    return str;
  };

  const updateLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {
      console.error('Error saving language preference', e);
    }
  };

  const updateThemePreference = async (pref: AppThemePreference) => {
    setThemePreference(pref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (e) {
      console.error('Error saving theme preference', e);
    }
  };

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
          setThemePreference(savedTheme as AppThemePreference);
        }
        const savedLang = await AsyncStorage.getItem(LANG_STORAGE_KEY);
        if (savedLang === 'fr' || savedLang === 'en') {
          setLanguageState(savedLang as Language);
        }
      } catch (e) {
        console.error('Error loading preferences', e);
      }
    };
    void loadPrefs();
  }, []);

  const getCurrentSubscriptionState = async (userId: string) => {
    const fallback = {
      subscription_plan_id: null as string | null,
      invisible_mode_eligible: false,
      has_active_subscription: false,
    };

    try {
      const now = new Date().toISOString();
      const snapshot = await db.collection(COLLECTIONS.SUBSCRIPTIONS)
        .where('user_id', '==', userId)
        .where('status', '==', 'active')
        .where('current_period_end', '>', now)
        .orderBy('current_period_end', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return fallback;

      const sub = snapshot.docs[0].data();
      const planId = (sub.plan_id || '').toUpperCase();

      return {
        subscription_plan_id: planId,
        invisible_mode_eligible: INVISIBLE_MODE_ELIGIBLE_PLANS.has(planId),
        has_active_subscription: true,
      };
    } catch (e) {
      console.error('Error getting subscription state:', e);
      return fallback;
    }
  };

  const mapProfileToUser = (
    profile: any,
    options?: {
      subscription_plan_id?: string | null;
      invisible_mode_eligible?: boolean;
      has_active_subscription?: boolean;
    }
  ): User => {
    const is_premium = options?.has_active_subscription ?? !!profile.is_premium;
    const subscriptionPlanId = String(options?.subscription_plan_id || '').toUpperCase();
    const trialInvisibleEligible = isMaleTrialActiveFromProfile({
      ...profile,
      is_premium: is_premium,
    });
    const invisibleModeEligible =
      (options?.invisible_mode_eligible ?? false) ||
      (subscriptionPlanId === 'QUARTERLY' && is_premium) ||
      (subscriptionPlanId === 'MONTHLY' && is_premium && String(profile.gender || '').toUpperCase() === 'FEMALE') ||
      trialInvisibleEligible;

    return {
      id: profile.id,
      name: profile.name || 'Utilisateur',
      age: Number(profile.age) || 18,
      gender: (profile.gender || Gender.OTHER) as Gender,
      photos: profile.photos || [],
      bio: profile.bio || '',
      interests: profile.interests || [],
      phone: profile.phone ?? null,
      location: {
        lat: Number.isFinite(profile.latitude) ? profile.latitude : null,
        lng: Number.isFinite(profile.longitude) ? profile.longitude : null,
        city: profile.city || '',
        country: profile.country || null,
      },
      is_verified: !!profile.is_verified,
      is_premium,
      boosted_until: profile.boosted_until ?? null,
      golden_rose_until: profile.golden_rose_until ?? null,
      relationship_goal: profile.relationship_goal ?? null,
      last_active_at: profile.last_active_at ?? null,
      likes_count: profile.likes_count || 0,
      roses_count: profile.roses_count || 0,
      galanterie_score: profile.galanterie_score || 5.0,
      galanterie_ratings_count: profile.galanterie_ratings_count || 0,
      is_invisible: !!profile.is_invisible && invisibleModeEligible,
      is_admin: !!profile.is_admin,
      suspended_at: profile.suspended_at ?? null,
      photo_review_status: profile.photo_review_status ?? 'APPROVED',
      is_vip: !!profile.is_vip,
      is_partner: !!profile.is_partner,
      trial_started_at: profile.trial_started_at ?? null,
      subscription_plan_id: options?.subscription_plan_id ?? null,
      invisible_mode_eligible: invisibleModeEligible,
      preferences: {
        targetGender: profile.target_gender || [],
        minAge: 18,
        maxAge: 35,
        maxDistance: 50,
      },
    };
  };

  const updateLastActive = async (userId: string) => {
    try {
      await db.collection(COLLECTIONS.PROFILES).doc(userId).update({
        last_active_at: new Date().toISOString()
      });
    } catch (_e) {}
  };

  const refreshProfiles = async () => {
    try {
      const snapshot = await db.collection(COLLECTIONS.PROFILES)
        .where('onboarding_completed', '==', true)
        .where('is_admin', '==', false)
        .get();

      const activeProfiles = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => !p.suspended_at && p.photo_review_status !== 'REJECTED');

      setUsers(activeProfiles.map(p => mapProfileToUser(p)));
      setLastError(null);
    } catch (e) {
      setLastError("Impossible de charger les profils.");
    }
  };


  const refreshCurrentUser = async (userId?: string): Promise<User | null> => {
    const resolvedUserId = userId ?? fbUser?.uid;
    if (!resolvedUserId) return null;
    try {
      try {
        await apiRequest('/api/subscriptions/sync', { method: 'POST', requireAuth: true });
      } catch (_e) {}

      const doc = await db.collection(COLLECTIONS.PROFILES).doc(resolvedUserId).get();
      if (!doc.exists) {
        setLastError("Profil non trouvé.");
        return null;
      }

      const profile = { id: doc.id, ...doc.data() } as any;

      if (profile.suspended_at) {
        await fbAuth.signOut();
        setCurrentUser(null);
        setLastError("Votre compte est suspendu.");
        return null;
      }

      if (!profile.onboarding_completed) {
        setCurrentUser(null);
        return null;
      }

      const subState = await getCurrentSubscriptionState(resolvedUserId);
      const mapped = mapProfileToUser(profile, subState);

      // Auto-sync is_premium if mismatch
      if (profile.is_premium !== subState.has_active_subscription) {
        await db.collection(COLLECTIONS.PROFILES).doc(resolvedUserId).update({
          is_premium: subState.has_active_subscription
        });
      }

      setCurrentUser(mapped);
      setLastError(null);
      return mapped;
    } catch (e) {
      setLastError("Erreur de profil.");
      return null;
    }
  };


  const refreshMatches = async (userId?: string) => {
    const uid = userId ?? fbUser?.uid;
    if (!uid) return;
    try {
      // Note: Firestore doesn't support easy 'OR' for two fields until recently.
      // We do two queries or one where with array-contains if we store [u1, u2] in a field.
      const q1 = db.collection(COLLECTIONS.MATCHES).where('user_one_id', '==', uid).get();
      const q2 = db.collection(COLLECTIONS.MATCHES).where('user_two_id', '==', uid).get();
      const [s1, s2] = await Promise.all([q1, q2]);

      const allMatches = [...s1.docs, ...s2.docs].map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(allMatches);
    } catch (e) {
      console.error('Error refreshing matches:', e);
    }
  };

  const refreshMessages = async () => {
    if (!fbUser) return;
    // For RTDB, we usually subscribe. But for initial load:
    setMessages([]);
  };

  const registerPushToken = async (userId: string) => {
    try {
      // 1. Get FCM Token (Native Firebase)
      let token = null;

      if (Platform.OS !== 'web') {
        const authStatus = await fbMessaging.requestPermission();
        const enabled =
          authStatus === 1 ||
          authStatus === 2; // PROVISIONAL

        if (enabled) {
          token = await fbMessaging.getToken();
        }
      }

      // 2. Fallback to Expo Push Token if FCM fails or for local testing
      if (!token && Device?.isDevice) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const expoToken = await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || Constants?.expoConfig?.extra?.eas?.projectId
          });
          token = expoToken?.data;
        }
      }

      if (!token) return;

      pushTokenRef.current = token;

      // Store token in Firestore
      await db.collection('push_tokens').doc(`${userId}_${token.substring(0, 50)}`).set({
        user_id: userId,
        token,
        platform: Platform.OS,
        is_active: true,
        updated_at: new Date().toISOString()
      });
    } catch (_error) {
      console.error('Push Token Registration Error:', _error);
    }
  };

  useEffect(() => {
    const unsubscribe = fbAuth.onAuthStateChanged(async (user) => {
      setFbUser(user);
      if (user) {
        await updateLastActive(user.uid);
        const refreshedUser = await refreshCurrentUser(user.uid);
        if (refreshedUser) {
          await refreshProfiles();
          await refreshMatches(user.uid);
          await registerPushToken(user.uid);

          // Sécurité Admin : Tracker la connexion
          if (refreshedUser.is_admin) {
            void apiRequest('/api/tracking/event', {
              method: 'POST',
              requireAuth: true,
              body: JSON.stringify({ eventType: 'LOGIN' })
            });
          }
        }
      } else {
        setCurrentUser(null);
        setUsers([]);
        setMatches([]);
        setMessages([]);
      }
      setLoading(false);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.type === 'CHAT') void refreshMessages();
    });

    return () => {
      unsubscribe();
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
    };
  }, []);

  useEffect(() => {
    if (!fbUser?.uid) return;

    const refreshAppOnResume = async () => {
      const now = Date.now();
      if (resumeRefreshInFlightRef.current || (now - lastResumeRefreshAtRef.current) < APP_RESUME_REFRESH_COOLDOWN_MS) return;
      resumeRefreshInFlightRef.current = true;
      lastResumeRefreshAtRef.current = now;

      try {
        await updateLastActive(fbUser.uid);
        await refreshCurrentUser(fbUser.uid);
        await refreshMatches(fbUser.uid);
        setAppResumeVersion((prev) => prev + 1);
      } catch (_e) {} finally {
        resumeRefreshInFlightRef.current = false;
      }
    };

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && appStateRef.current !== 'active') void refreshAppOnResume();
      appStateRef.current = next;
    });

    return () => sub.remove();
  }, [fbUser?.uid]);

  // Realtime Messages with RTDB
  useEffect(() => {
    if (matches.length === 0) return;
    const unsubscribers: Array<() => void> = [];

    matches.forEach(match => {
      const ref = rtdb.ref(`messages/${match.id}`);
      const listener = ref.on('value', (snapshot) => {
        if (snapshot.exists()) {
          const msgs = Object.entries(snapshot.val()).map(([id, data]: any) => ({
            id,
            ...data
          }));
          setMessages(prev => {
            const otherMsgs = prev.filter(m => m.match_id !== match.id);
            return [...otherMsgs, ...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          });
        }
      });
      unsubscribers.push(() => ref.off('value', listener));
    });

    return () => unsubscribers.forEach(u => u());
  }, [matches]);

  // Realtime Matches with Firestore
  useEffect(() => {
    if (!fbUser?.uid) return;
    const q1 = db.collection(COLLECTIONS.MATCHES).where('user_one_id', '==', fbUser.uid);
    const q2 = db.collection(COLLECTIONS.MATCHES).where('user_two_id', '==', fbUser.uid);

    const unsub1 = q1.onSnapshot(() => refreshMatches());
    const unsub2 = q2.onSnapshot(() => refreshMatches());

    return () => { unsub1(); unsub2(); };
  }, [fbUser?.uid]);

  const logout = async () => {
    try {
      if (fbUser) {
        await db.collection('push_tokens').where('user_id', '==', fbUser.uid).get()
          .then(qs => qs.forEach(doc => doc.ref.update({ is_active: false })));
      }
      await fbAuth.signOut();
    } catch (e) {
      setLastError("Erreur lors de la déconnexion.");
    }
  };

  const updateCurrentUser = async (updates: Partial<User>) => {
    if (!currentUser || !fbUser) return;
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.bio) payload.bio = updates.bio;
    if (updates.age) payload.age = updates.age;
    if (updates.photos) payload.photos = updates.photos;
    if (updates.interests) payload.interests = updates.interests;
    if (updates.location?.city) payload.city = updates.location.city;
    if (updates.location?.lat) payload.latitude = updates.location.lat;
    if (updates.location?.lng) payload.longitude = updates.location.lng;

    try {
      await db.collection(COLLECTIONS.PROFILES).doc(fbUser.uid).update(payload);
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (e) {
      console.error('Update profile error:', e);
    }
  };

  const toggleInvisibleMode = async (enabled: boolean): Promise<boolean> => {
    if (!currentUser || !fbUser || !currentUser.invisible_mode_eligible) return false;
    try {
      await db.collection(COLLECTIONS.PROFILES).doc(fbUser.uid).update({ is_invisible: enabled });
      await refreshCurrentUser();
      return true;
    } catch (e) { return false; }
  };

  const activateBoost = async (): Promise<string | null> => {
    try {
      const data = await apiRequest<{ boosted_until?: string }>('/api/profile/boost', { method: 'POST', requireAuth: true });
      if (data.boosted_until) {
        setCurrentUser(prev => prev ? { ...prev, boosted_until: data.boosted_until } : null);
        return data.boosted_until;
      }
      return null;
    } catch (e) { return null; }
  };

  const markMessagesAsRead = async (matchId: string) => {
    try {
      await apiRequest('/api/messages/mark-read', { method: 'POST', requireAuth: true, body: JSON.stringify({ matchId }) });
    } catch (e) {}
  };

  const value = useMemo(
    () => ({
      isAuthenticated: !!fbUser && !!currentUser,
      currentUser,
      fbUser,
      users,
      matches,
      messages,
      appResumeVersion,
      lastError,
      clearError: () => setLastError(null),
      login: (user: User) => setCurrentUser(user),
      logout,
      updateCurrentUser,
      addMatch: (m: Match) => setMatches(prev => [m, ...prev]),
      addMessage: (m: Message) => setMessages(prev => [...prev, m]),
      refreshMatches,
      refreshMessages,
      refreshCurrentUser,
      toggleInvisibleMode,
      toggleUserVerification: (id: string) => {},
      suspendUser: (id: string) => {},
      activateBoost,
      markMessagesAsRead,
      theme: themePreference,
      setThemePreference: updateThemePreference,
      activeTheme,
      colors,
      language,
      setLanguage: updateLanguage,
      t,
    }),
    [fbUser, currentUser, users, matches, messages, appResumeVersion, lastError, themePreference, activeTheme, colors, language]
  );

  if (loading) return null;
  return <AppContext.Provider value={value as any}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
