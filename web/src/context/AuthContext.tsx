import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { fbAuth, db, rtdb, COLLECTIONS } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { TRANSLATIONS } from '@shared/translations';
import { apiRequest } from '@shared/lib/api';

type Language = 'fr' | 'en';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  matches: any[];
  messages: any[];
  users: any[];
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS.fr, params?: Record<string, any>) => string;
  logout: () => Promise<void>;
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
  t: (key) => key,
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Langue (Initialisée depuis le localStorage ou navigateur)
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('galant_lang');
    if (saved === 'fr' || saved === 'en') return saved;
    return navigator.language.startsWith('fr') ? 'fr' : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('galant_lang', lang);
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

  // Auth & Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, COLLECTIONS.PROFILES, firebaseUser.uid));
        if (profileDoc.exists()) {
          const profileData = { id: profileDoc.id, ...profileDoc.data() };
          setProfile(profileData);

          // Sécurité Admin : Tracker la connexion
          if (profileData.is_admin) {
            apiRequest('/api/tracking/event', {
              method: 'POST',
              requireAuth: true,
              body: JSON.stringify({ eventType: 'LOGIN' })
            }).catch(() => {});
          }
        }
      } else {
        setProfile(null);
        setMatches([]);
        setMessages([]);
        setUsers([]);
      }
      setLoading(false);
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
    });

    const q1 = query(collection(db, COLLECTIONS.MATCHES), where('user_one_id', '==', user.uid));
    const q2 = query(collection(db, COLLECTIONS.MATCHES), where('user_two_id', '==', user.uid));

    const unsub1 = onSnapshot(q1, (snapshot) => {
      const m1 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(prev => {
        const otherMatches = prev.filter(m => m.user_one_id !== user.uid);
        return [...otherMatches, ...m1];
      });
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      const m2 = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMatches(prev => {
        const otherMatches = prev.filter(m => m.user_two_id !== user.uid);
        return [...otherMatches, ...m2];
      });
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

  const value = useMemo(() => ({
    user,
    profile,
    matches,
    messages,
    users,
    loading,
    language,
    setLanguage,
    t,
    logout
  }), [user, profile, matches, messages, users, loading, language]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
