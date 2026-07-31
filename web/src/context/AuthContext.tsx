import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { fbAuth, db, rtdb, COLLECTIONS, fbMessaging } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { getToken, onMessage } from 'firebase/messaging';
import { TRANSLATIONS } from '@shared/translations';
import { apiRequest } from '@shared/lib/api';

type Language = 'fr' | 'en';
type ThemePreference = 'light' | 'dark' | 'system';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  matches: any[];
  messages: any[];
  users: any[];
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  themePreference: ThemePreference;
  activeTheme: 'light' | 'dark';
  setThemePreference: (theme: ThemePreference) => void;
  isFakeCallActive: boolean;
  setIsFakeCallActive: (active: boolean) => void;
  registerWebPushToken: (userId: string) => Promise<void>;
  t: (key: keyof typeof TRANSLATIONS.fr, params?: Record<string, any>) => string;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  matches: [],
  messages: [],
  users: [],
  loading: true,
  language: 'fr',
  setLanguage: () => {},
  themePreference: 'system',
  activeTheme: 'light',
  setThemePreference: () => {},
  isFakeCallActive: false,
  setIsFakeCallActive: () => {},
  t: (key) => key,
  logout: async () => {},
  reloadUser: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFakeCallActive, setIsFakeCallActive] = useState(false);

  // Langue (Initialisée depuis le localStorage ou navigateur)
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('galant_lang');
    if (saved === 'fr' || saved === 'en') return saved;
    return navigator.language.startsWith('fr') ? 'fr' : 'en';
  });

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('galant_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const activeTheme = useMemo(() => {
    if (themePreference === 'system') return systemTheme;
    return themePreference;
  }, [themePreference, systemTheme]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('galant_lang', lang);
  };

  const setThemePreference = (theme: ThemePreference) => {
    setThemePreferenceState(theme);
    localStorage.setItem('galant_theme', theme);
  };

  const t = (key: keyof typeof TRANSLATIONS.fr, params?: Record<string, any>) => {
    let str = TRANSLATIONS[language][key] || key;
    if (params) {
      Object.keys(params).forEach(p => {
        str = str.replace(`{${p}}`, params[p]);
      });
    }
    return str;
  };

  const registerWebPushToken = async (userId: string) => {
    try {
      if (!fbMessaging) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const token = await getToken(fbMessaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      if (token) {
        await setDoc(doc(db, 'push_tokens', `${userId}_web`), {
          user_id: userId, token, platform: 'web', is_active: true, updated_at: new Date().toISOString()
        });
        console.log('✅ Web Push Token registered');
      }
    } catch (e) { console.error('❌ Web Push error:', e); }
  };

  // Auth & Profile
  useEffect(() => {
    // Si fbAuth n'est pas correctement initialisé (fallback {}), on arrête tout de suite
    if (!fbAuth || typeof fbAuth.onAuthStateChanged !== 'function') {
      console.error('Firebase Auth is not initialized properly.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(fbAuth, (firebaseUser) => {
      setUser(firebaseUser);
      let unsubProfile: (() => void) | null = null;

      if (firebaseUser) {
        // Listen to Profile changes in real-time
        unsubProfile = onSnapshot(doc(db, COLLECTIONS.PROFILES, firebaseUser.uid), (profileDoc) => {
          if (profileDoc.exists()) {
            const profileData = { id: profileDoc.id, ...profileDoc.data() };
            setProfile(profileData);

            // Admin Login tracking (once)
            if (profileData.is_admin && !profile) {
              apiRequest('/api/tracking/event', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({ eventType: 'LOGIN' })
              }).catch(() => {});
            }
          }
          setLoading(false);
        }, (error) => {
          console.error('Profile Snapshot error:', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setMatches([]);
        setMessages([]);
        setUsers([]);
        setLoading(false);
      }

      return () => {
        if (unsubProfile) unsubProfile();
      };
    });
    return () => unsubscribe();
  }, []);

  // Realtime Matches (Firestore)
  useEffect(() => {
    if (!user) return;

    const qUsers = query(collection(db, COLLECTIONS.PROFILES), where('onboarding_completed', '==', true));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const activeProfiles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(activeProfiles);
    }, (error) => {
      console.error('Firestore Users Snapshot error:', error);
    });

    const q1 = query(collection(db, COLLECTIONS.MATCHES), where('user_one_id', '==', user.uid));
    const q2 = query(collection(db, COLLECTIONS.MATCHES), where('user_two_id', '==', user.uid));

    const unsub1 = onSnapshot(q1, (snapshot) => {
      const m1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(prev => {
        const otherMatches = prev.filter(m => m.user_one_id !== user.uid);
        return [...otherMatches, ...m1];
      });
    }, (error) => {
      console.error('Firestore Matches Snapshot 1 error:', error);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const m2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(prev => {
        const otherMatches = prev.filter(m => m.user_two_id !== user.uid);
        return [...otherMatches, ...m2];
      });
    }, (error) => {
      console.error('Firestore Matches Snapshot 2 error:', error);
    });

    return () => {
      unsubUsers();
      unsub1();
      unsub2();
    };
  }, [user]);

  // Realtime Messages (RTDB)
  useEffect(() => {
    if (matches.length === 0 || !user) return;
    const unsubs: Array<() => void> = [];

    matches.forEach(match => {
      const msgRef = ref(rtdb, `messages/${match.id}`);
      const unsub = onValue(msgRef, (snapshot) => {
        if (snapshot.exists()) {
          const msgs = Object.entries(snapshot.val()).map(([id, data]: any) => ({
            id,
            ...data
          }));
          setMessages(prev => {
            const otherMsgs = prev.filter(m => m.match_id !== match.id);
            return [...otherMsgs, ...msgs].sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [matches, user]);

  const logout = async () => {
    await fbAuth.signOut();
  };

  const reloadUser = async () => {
    if (fbAuth.currentUser) {
      await fbAuth.currentUser.reload();
      // On force React à voir un nouvel objet pour déclencher le re-render
      // mais on garde les méthodes en récupérant l'instance fraîche
      setUser(null);
      setTimeout(() => setUser(fbAuth.currentUser), 10);
    }
  };

  const value = useMemo(() => ({
    user,
    profile,
    matches,
    messages,
    users,
    loading,
    language,
    setLanguage,
    themePreference,
    activeTheme,
    setThemePreference,
    isFakeCallActive,
    setIsFakeCallActive,
    registerWebPushToken,
    t,
    logout,
    reloadUser
  }), [user, profile, matches, messages, users, loading, language, themePreference, activeTheme, isFakeCallActive]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
