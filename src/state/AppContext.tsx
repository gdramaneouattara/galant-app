
import React, { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { Message, Match, User } from '../types';
import { supabase } from '../lib/supabase';

const INVISIBLE_MODE_ELIGIBLE_PLANS = new Set(['BIANNUAL', 'ANNUAL']);

type AppContextValue = {
  isAuthenticated: boolean;
  currentUser: User | null;
  session: Session | null;
  users: User[];
  matches: Match[];
  messages: Message[];
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
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const matchChannelsRef = useRef<RealtimeChannel[]>([]);
  const matchesChannelRef = useRef<RealtimeChannel | null>(null);

  const getCurrentSubscriptionState = async (userId: string) => {
    const fallback = {
      subscription_plan_id: null as string | null,
      invisible_mode_eligible: false,
    };

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end, updated_at, created_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error || !data || data.length === 0) return fallback;

      const nowTs = Date.now();
      let latestPlan: { planId: string; score: number } | null = null;

      for (const sub of data) {
        if (sub.current_period_end && new Date(sub.current_period_end).getTime() <= nowTs) continue;
        const planId = (sub.plan_id || '').toUpperCase();
        if (!planId) continue;
        const score = new Date(sub.current_period_end || sub.updated_at || sub.created_at || 0).getTime();
        if (!latestPlan || score > latestPlan.score) {
          latestPlan = { planId, score };
        }
      }

      if (!latestPlan) return fallback;

      return {
        subscription_plan_id: latestPlan.planId,
        invisible_mode_eligible: INVISIBLE_MODE_ELIGIBLE_PLANS.has(latestPlan.planId),
      };
    } catch (_e) {
      return fallback;
    }
  };

  const mapProfileToUser = (
    profile: any,
    options?: { subscription_plan_id?: string | null; invisible_mode_eligible?: boolean }
  ): User => ({
    id: profile.id,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    photos: profile.photos || [],
    bio: profile.bio || '',
    interests: profile.interests || [],
    location: { lat: 0, lng: 0, city: profile.city || '' },
    isVerified: !!profile.is_verified,
    isPremium: !!profile.is_premium,
    boosted_until: profile.boosted_until ?? null,
    is_invisible: !!profile.is_invisible && !!profile.is_premium && (options?.invisible_mode_eligible ?? true),
    is_admin: !!profile.is_admin,
    suspended_at: profile.suspended_at ?? null,
    subscription_plan_id: options?.subscription_plan_id ?? null,
    invisible_mode_eligible: options?.invisible_mode_eligible ?? false,
    preferences: {
      targetGender: profile.target_gender || [],
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
    },
  });

  const refreshProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('suspended_at', null)
        .eq('is_admin', false);
      if (error) {
        setLastError("Impossible de charger les profils.");
        return;
      }
      if (data) {
        setLastError(null);
        setUsers(data.map((profile) => mapProfileToUser(profile)));
      }
    } catch (_e) {
      setLastError("Impossible de charger les profils.");
    }
  };


  const refreshCurrentUser = async (userId?: string): Promise<User | null> => {
    const resolvedUserId = userId ?? session?.user?.id;
    if (!resolvedUserId) return null;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', resolvedUserId)
        .single();
      if (error) {
        setLastError("Impossible de charger votre profil.");
        return null;
      }
      if (profile) {
        if (profile.suspended_at) {
          await supabase.auth.signOut({ scope: 'local' });
          resetAuthState();
          setLastError("Votre compte est suspendu. Contactez le support.");
          return null;
        }
        const subscriptionState = await getCurrentSubscriptionState(resolvedUserId);
        if (profile.is_invisible && !subscriptionState.invisible_mode_eligible) {
          const { error: disableInvisibleError } = await supabase
            .from('profiles')
            .update({ is_invisible: false })
            .eq('id', resolvedUserId);
          if (!disableInvisibleError) {
            profile.is_invisible = false;
          }
        }
        setLastError(null);
        const mapped = mapProfileToUser(profile, subscriptionState);
        setCurrentUser(mapped);
        return mapped;
      }
      return null;
    } catch (_e) {
      setLastError("Impossible de charger votre profil.");
      return null;
    }
  };


  const refreshMatches = async (userId?: string) => {
    const uid = userId ?? session?.user?.id;
    if (!uid) return;
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_one_id.eq.${uid},user_two_id.eq.${uid}`)
        .order('created_at', { ascending: false });
      if (error) {
        setLastError("Impossible de charger les matchs.");
        return;
      }
      if (data) {
        setLastError(null);
        setMatches(data as Match[]);
      }
    } catch (_e) {
      setLastError("Impossible de charger les matchs.");
    }
  };

  const refreshMessages = async () => {
    if (!session?.user) return;
    const matchIds = matches.map((m) => m.id);
    if (matchIds.length === 0) {
      setMessages([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true });
      if (error) {
        setLastError("Impossible de charger les messages.");
        return;
      }
      if (data) {
        setLastError(null);
        setMessages(data as Message[]);
      }
    } catch (_e) {
      setLastError("Impossible de charger les messages.");
    }
  };

  const clearMatchChannels = () => {
    matchChannelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    matchChannelsRef.current = [];
  };

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          await refreshCurrentUser(currentSession.user.id);
          await refreshProfiles();
          await refreshMatches(currentSession.user.id);
        }
      } catch (_e) {
        setLastError("Impossible d'initialiser la session.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        setSession(newSession);
        if (newSession?.user && newSession.user.id !== currentUser?.id) {
          await refreshCurrentUser(newSession.user.id);
          await refreshProfiles();
          await refreshMatches(newSession.user.id);
        } else if (!newSession) {
          setCurrentUser(null);
          setUsers([]);
          setMatches([]);
          setMessages([]);
          clearMatchChannels();
          if (matchesChannelRef.current) {
            supabase.removeChannel(matchesChannelRef.current);
            matchesChannelRef.current = null;
          }
        }
      } catch (_e) {
        setLastError("Impossible de synchroniser la session.");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    refreshMessages();
    clearMatchChannels();

    const newChannels: RealtimeChannel[] = [];
    matches.forEach((match) => {
      const channel = supabase
        .channel(`messages_${match.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${match.id}` },
          (payload) => {
            const newMessage = payload.new as Message;
            setMessages((prev) => [...prev, newMessage]);
          }
        )
        .subscribe();
      newChannels.push(channel);
    });
    matchChannelsRef.current = newChannels;
  }, [matches]);

  useEffect(() => {
    if (!session?.user) return;
    if (matchesChannelRef.current) {
      supabase.removeChannel(matchesChannelRef.current);
    }
    const uid = session.user.id;
    const channel = supabase
      .channel(`matches_${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `user_one_id=eq.${uid}` },
        () => refreshMatches()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `user_two_id=eq.${uid}` },
        () => refreshMatches()
      )
      .subscribe();
    matchesChannelRef.current = channel;
  }, [session?.user?.id]);

  const login = (user: User) => {
    setCurrentUser(user);
  };

  const resetAuthState = () => {
    setCurrentUser(null);
    setSession(null);
    setUsers([]);
    setMatches([]);
    setMessages([]);
    clearMatchChannels();
    if (matchesChannelRef.current) {
      supabase.removeChannel(matchesChannelRef.current);
      matchesChannelRef.current = null;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        throw error;
      }
    } catch (_e) {
      setLastError("Déconnexion locale effectuée, mais la requête serveur a échoué.");
    } finally {
      resetAuthState();
    }
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!currentUser) return;

    const sanitized = { ...updates };
    delete sanitized.isPremium;
    delete sanitized.isVerified;
    delete sanitized.boosted_until;
    delete sanitized.is_invisible;
    delete sanitized.is_admin;
    delete sanitized.suspended_at;
    delete sanitized.subscription_plan_id;
    delete sanitized.invisible_mode_eligible;

    setCurrentUser((prev) => ({
      ...prev!,
      ...sanitized,
      preferences: {
        ...prev!.preferences,
        ...sanitized.preferences,
      },
    }));

    const payload: Record<string, unknown> = {};
    if (sanitized.name !== undefined) payload.name = sanitized.name;
    if (sanitized.age !== undefined) payload.age = sanitized.age;
    if (sanitized.gender !== undefined) payload.gender = sanitized.gender;
    if (sanitized.bio !== undefined) payload.bio = sanitized.bio;
    if (sanitized.interests !== undefined) payload.interests = sanitized.interests;
    if (sanitized.photos !== undefined) payload.photos = sanitized.photos;
    if (sanitized.location?.city !== undefined) payload.city = sanitized.location.city;
    if (sanitized.preferences?.targetGender !== undefined) {
      payload.target_gender = sanitized.preferences.targetGender;
    }

    if (Object.keys(payload).length > 0) {
      void supabase.from("profiles").update(payload).eq("id", currentUser.id);
    }
  };

  const toggleInvisibleMode = async (enabled: boolean): Promise<boolean> => {
    if (!currentUser) {
      setLastError("Impossible de modifier le mode invisible.");
      return false;
    }
    if (enabled && !currentUser.invisible_mode_eligible) {
      setLastError("Le mode invisible est reserve aux abonnements 6 mois et 1 an.");
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_invisible: enabled })
        .eq('id', currentUser.id)
        .select('*')
        .single();

      if (error || !data) {
        setLastError("Impossible de mettre a jour le mode invisible.");
        return false;
      }

      await refreshCurrentUser(currentUser.id);
      setLastError(null);
      await refreshProfiles();
      return true;
    } catch (_e) {
      setLastError("Impossible de mettre a jour le mode invisible.");
      return false;
    }
  };

  const addMatch = (match: Match) => setMatches((prev) => [match, ...prev]);
  const addMessage = (message: Message) => setMessages((prev) => [...prev, message]);
  const clearError = () => setLastError(null);

  const toggleUserVerification = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isVerified: !u.isVerified } : u)));
  };

  const suspendUser = (userId: string) => setUsers((prev) => prev.filter((u) => u.id !== userId));

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: !!session?.user && !!currentUser,
      currentUser,
      users,
      matches,
      messages,
      lastError,
      clearError,
      login,
      logout,
      updateCurrentUser,
      addMatch,
      addMessage,
      refreshMatches,
      refreshMessages,
      refreshCurrentUser,
      toggleInvisibleMode,
      toggleUserVerification,
      suspendUser,
    }),
    [session, currentUser, users, matches, messages, lastError]
  );

  if (loading) {
    return null;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
};
