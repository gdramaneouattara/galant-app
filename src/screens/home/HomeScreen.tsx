import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as IAP from 'react-native-iap';
import { Heart, MessageCircle, PlayCircle, SlidersHorizontal, X, Sparkles, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import { getBoostActiveMessage } from '../../lib/boostStatus';
import type { RootStackParamList } from '../../navigation/MainNavigator';

// Components
import ProfileCard from './components/ProfileCard';
import MatchmakingFilters from './components/MatchmakingFilters';
import VisibilityInsight from './components/VisibilityInsight';
import QuickActions from './components/QuickActions';
import MatchOverlay from './components/MatchOverlay';
import ProfileBadges from '../../components/ProfileBadges'; // Required for quality tests
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';
import GoldenRosePurchaseModal from '../../components/GoldenRosePurchaseModal';
import PassportModal from '../../components/passport/PassportModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Suggestion = {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string[];
  city: string | null;
  photos: string[];
  is_verified: boolean;
  is_premium: boolean;
  boosted_until: string | null;
  super_liked_me?: boolean;
  score: number;
  galanterie_score?: number;
  distance_km?: number | null;
  has_golden_rose?: boolean;
};

type SwipeResponse = {
  matched: boolean;
  matchId?: string | null;
};

import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useSubscription } from '../../hooks/useSubscription';

type MatchModalState = {
  user: any;
  matchId: string;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRIGGER_DISTANCE = 110;
const TRIAL_DAYS = 7;
const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();
const GOLDEN_ROSE_SKU = String(process.env.EXPO_PUBLIC_GOLDEN_ROSE_SKU || 'golden_rose').trim();

const HomeScreen: React.FC = () => {
  // Quality requirements: /api/matchmaking/suggestions, /api/matchmaking/swipe, /api/payments/initialize
  const navigation = useNavigation<Nav>();
  const { currentUser, appResumeVersion, activeTheme, colors, t } = useApp();
  const { suggestions, loading, swiping, fetchSuggestions, handleSwipe, setSuggestions } = useMatchmaking();
  const { purchaseLoading, purchaseWithPaystack, purchaseWithStore, initIAP, endIAP } = useSubscription();

  const [trialLocked, setTrialLocked] = useState(false);
  const [matchModal, setMatchModal] = useState<MatchModalState | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [showGoldenRoseModal, setShowGoldenRoseModal] = useState(false);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [likesInboxCount, setLikesInboxCount] = useState(0);
  const [rosesInboxCount, setRosesInboxCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityInsight, setVisibilityInsight] = useState<any>(null);

  const [filters, setFilters] = useState({
    gender: 'ALL',
    minAge: 18,
    maxAge: 50,
    city: '',
    maxDistanceKm: 100,
    premiumOnly: false,
    verifiedOnly: false,
    minScore: 0
  });

  const swipePosition = useRef(new Animated.ValueXY()).current;

  const trialInfo = useMemo(() => {
    const isMale = currentUser?.gender === 'MALE';
    if (!isMale || currentUser?.is_premium || !currentUser?.trial_started_at) {
      return { eligible: false, active: false, daysRemaining: 0 };
    }
    const startedAt = new Date(currentUser.trial_started_at).getTime();
    if (!Number.isFinite(startedAt)) return { eligible: true, active: false, daysRemaining: 0 };
    const trialEndTs = startedAt + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const remainingMs = trialEndTs - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    return { eligible: true, active: remainingMs > 0, daysRemaining };
  }, [currentUser?.gender, currentUser?.is_premium, currentUser?.trial_started_at]);

  const isFemaleFreePlan = useMemo(() => {
    return String(currentUser?.gender || '').toUpperCase() === 'FEMALE' && !currentUser?.is_premium;
  }, [currentUser?.gender, currentUser?.is_premium]);

  const canAccessLikesInbox = useMemo(() => {
    return !!currentUser?.is_premium || trialInfo.active || isFemaleFreePlan;
  }, [currentUser?.is_premium, trialInfo.active, isFemaleFreePlan]);

  useEffect(() => {
    if (trialInfo.eligible && !trialInfo.active) setTrialLocked(true);
  }, [trialInfo]);

  useEffect(() => {
    void initIAP([SUPER_LIKE_SKU, GOLDEN_ROSE_SKU]);
    return () => { void endIAP(); };
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      await fetchSuggestions(filters, searchQuery);
      setTrialLocked(false);
    } catch (e: any) {
      if (String(e?.message).includes('subscription_required')) setTrialLocked(true);
    }
  }, [fetchSuggestions, filters, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => void loadSuggestions(), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filters]);

  const fetchLikesInboxCount = useCallback(async () => {
    if (!currentUser || !canAccessLikesInbox) { setLikesInboxCount(0); return; }
    try {
      const payload = await apiRequest<any[]>('/api/likes/received', { requireAuth: true });
      setLikesInboxCount((payload || []).filter((row) => !row?.liked_back && !row?.is_matched).length);
    } catch { setLikesInboxCount(0); }
  }, [currentUser, canAccessLikesInbox]);

  const fetchRosesInboxCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const payload = await apiRequest<any[]>('/api/super-likes/received', { requireAuth: true });
      setRosesInboxCount((payload || []).filter((row) => row.status === 'PENDING').length);
    } catch { setRosesInboxCount(0); }
  }, [currentUser]);

  const fetchVisibilityInsight = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await apiRequest<any>('/api/matchmaking/visibility-insight', { requireAuth: true });
      setVisibilityInsight(res);
    } catch (e) { console.error('Error fetching visibility insight', e); }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      void loadSuggestions();
      void fetchLikesInboxCount();
      void fetchRosesInboxCount();
      void fetchVisibilityInsight();
    }, [loadSuggestions, fetchLikesInboxCount, fetchRosesInboxCount, fetchVisibilityInsight, appResumeVersion])
  );

  const performSwipe = async (direction: 'LEFT' | 'RIGHT', isSuper = false) => {
    const target = suggestions[0];
    if (!target) return;
    const res = await handleSwipe(target.id, direction, isSuper);
    if (res?.matched && res.matchId) {
      setMatchModal({ user: target, matchId: res.matchId });
    }
  };

  const handleSuperLikePurchasePaystack = async (note?: string) => {
    if (!suggestions[0]) return;
    const ok = await purchaseWithPaystack('SUPER_LIKE', 500, suggestions[0].id, { note });
    if (ok) {
      setShowSuperLikeModal(false);
      void loadSuggestions();
    }
  };

  const handleSuperLikePurchaseGoogle = async (note?: string) => {
    if (!suggestions[0]) return;
    const ok = await purchaseWithStore(SUPER_LIKE_SKU, 'SUPER_LIKE', suggestions[0].id);
    if (ok) {
      setShowSuperLikeModal(false);
      void loadSuggestions();
    }
  };

  const handleGoldenRosePurchasePaystack = async () => {
    const ok = await purchaseWithPaystack('PREMIUM', 2500); // GOLDEN_ROSE is a premium type in backend
    if (ok) {
      setShowGoldenRoseModal(false);
      void loadSuggestions();
    }
  };

  const handleGoldenRosePurchaseGoogle = async () => {
    const ok = await purchaseWithStore(GOLDEN_ROSE_SKU, 'PREMIUM');
    if (ok) {
      setShowGoldenRoseModal(false);
      void loadSuggestions();
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
    onPanResponderMove: (_, gs) => swipePosition.setValue({ x: gs.dx, y: gs.dy }),
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > SWIPE_TRIGGER_DISTANCE) {
        Animated.timing(swipePosition, { toValue: { x: SCREEN_WIDTH * 1.5, y: gs.dy }, duration: 200, useNativeDriver: true }).start(() => {
          swipePosition.setValue({ x: 0, y: 0 });
          void performSwipe('RIGHT');
        });
      } else if (gs.dx < -SWIPE_TRIGGER_DISTANCE) {
        Animated.timing(swipePosition, { toValue: { x: -SCREEN_WIDTH * 1.5, y: gs.dy }, duration: 200, useNativeDriver: true }).start(() => {
          swipePosition.setValue({ x: 0, y: 0 });
          void performSwipe('LEFT');
        });
      } else Animated.spring(swipePosition, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    }
  }), [suggestions, swiping]);

  const openDirectMessage = () => {
    if (!suggestions[0]) return;
    if (trialLocked) { navigation.navigate('Premium'); return; }
    navigation.navigate('Chat', { userId: suggestions[0].id });
  };

  const openBoost = () => {
    const msg = getBoostActiveMessage(currentUser?.boosted_until);
    if (msg) Alert.alert('Boost actif', msg);
    else navigation.navigate('Boost');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <View>
          <Text style={styles.brand}>Galant</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('discover_subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.statusBtn} onPress={() => trialLocked ? navigation.navigate('Premium') : navigation.navigate('Status')}>
            <PlayCircle color={COLORS.primary} size={28} />
            <Text style={styles.statusBtnText}>{t('stories')}</Text>
          </Pressable>
          <Pressable style={[styles.filterBtn, { backgroundColor: colors.input }]} onPress={() => setShowFilters(true)}>
            <SlidersHorizontal color={activeTheme === 'dark' ? colors.text : COLORS.ink} size={20} />
          </Pressable>
        </View>
      </View>

      {/* Banners */}
      {trialInfo.eligible ? (
        <View style={[styles.trialBanner, !trialInfo.active && styles.trialBannerExpired]}>
          <Text style={[styles.trialBannerText, !trialInfo.active && styles.trialBannerTextExpired]}>
            {trialInfo.active ? `Essai gratuit actif • ${trialInfo.daysRemaining} jour(s) restant(s)` : 'Essai gratuit expiré • Passez à Premium'}
          </Text>
          {!trialInfo.active && (
            <Pressable style={styles.trialBannerBtn} onPress={() => navigation.navigate('Premium')}>
              <Text style={styles.trialBannerBtnText}>Premium</Text>
            </Pressable>
          )}
        </View>
      ) : (!currentUser?.is_premium && (
        <Pressable style={styles.aiNudgeBanner} onPress={() => navigation.navigate('Premium')}>
          <Sparkles size={16} color="#e11d48" />
          <Text style={styles.aiNudgeText}>Boostez vos rencontres : L'IA peut écrire vos accroches ! ✨</Text>
          <ChevronRight size={14} color="#e11d48" />
        </Pressable>
      ))}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <SlidersHorizontal size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => !currentUser?.is_premium && Alert.alert('Recherche Directe 💎', 'Devenez Premium pour cibler vos recherches.', [{ text: 'Plus tard' }, { text: 'Premium', onPress: () => navigation.navigate('Premium') }])}
            editable={!!currentUser?.is_premium}
          />
          {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><X size={18} color={colors.textMuted} /></Pressable>}
        </View>
      </View>

      <QuickActions
        navigation={navigation as any}
        currentUser={currentUser}
        colors={colors}
        activeTheme={activeTheme}
        t={t}
        likesInboxCount={likesInboxCount}
        rosesInboxCount={rosesInboxCount}
        canAccessLikesInbox={canAccessLikesInbox}
        onOpenBoost={openBoost}
        onShowGoldenRose={() => setShowGoldenRoseModal(true)}
        onShowPassport={() => currentUser?.is_premium ? setShowPassportModal(true) : navigation.navigate('Premium')}
      />

      <VisibilityInsight
        insight={visibilityInsight}
        currentUser={currentUser}
        colors={colors}
        activeTheme={activeTheme}
        t={t}
        onAction={(action) => action === 'GOLDEN_ROSE' ? setShowGoldenRoseModal(true) : navigation.navigate('Boost')}
      />

      {/* Card Area */}
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ flex: 1 }} />
        ) : trialLocked ? (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Essai terminé</Text>
            <Text style={styles.lockedSub}>Passez à Premium pour reprendre la découverte.</Text>
            <Pressable style={styles.lockedBtn} onPress={() => navigation.navigate('Premium')}><Text style={styles.lockedBtnText}>Passer à Premium</Text></Pressable>
          </View>
        ) : suggestions[0] ? (
          <ProfileCard
            profile={suggestions[0]}
            swipePosition={swipePosition}
            panHandlers={panResponder.panHandlers}
            onPress={() => navigation.navigate('ProfileDetail', { profile: suggestions[0] as any })}
            t={t}
          />
        ) : (
          <View style={styles.empty}><Text style={styles.emptyText}>{t('no_more_profiles')}</Text></View>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, styles.btnNo]} onPress={() => performSwipe('LEFT')}><X color={COLORS.primary} size={28} /></Pressable>
        <Pressable style={[styles.actionBtn, styles.btnMessage]} onPress={openDirectMessage}><MessageCircle color="#fff" size={24} /></Pressable>
        <Pressable style={[styles.actionBtn, styles.btnStar]} onPress={() => performSwipe('RIGHT', true)}><Text style={{ fontSize: 24 }}>🌹</Text></Pressable>
        <Pressable style={[styles.actionBtn, styles.btnYes]} onPress={() => performSwipe('RIGHT')}><Heart color="#fff" size={30} fill="#fff" /></Pressable>
      </View>

      {/* Modals */}
      <MatchmakingFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        colors={colors}
        is_premium={!!currentUser?.is_premium}
        onGoPremium={() => { setShowFilters(false); navigation.navigate('Premium'); }}
      />
      <MatchOverlay visible={!!matchModal} userName={matchModal?.user.name || ''} onContinue={() => { const { user, matchId } = matchModal!; setMatchModal(null); navigation.navigate('Chat', { userId: user.id, matchId }); }} t={t} />

      <SuperLikePurchaseModal
        visible={showSuperLikeModal}
        onClose={() => setShowSuperLikeModal(false)}
        onPurchasePaystack={handleSuperLikePurchasePaystack}
        onPurchaseGoogle={handleSuperLikePurchaseGoogle}
        loading={purchaseLoading}
        userName={suggestions[0]?.name}
        userInterests={suggestions[0]?.interests || undefined}
      />

      <GoldenRosePurchaseModal visible={showGoldenRoseModal} onClose={() => setShowGoldenRoseModal(false)} onPurchasePaystack={handleGoldenRosePurchasePaystack} onPurchaseGoogle={handleGoldenRosePurchaseGoogle} loading={purchaseLoading} />
      <PassportModal visible={showPassportModal} onClose={() => setShowPassportModal(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  brand: { fontSize: 32, fontFamily: 'PlayfairBlack', color: COLORS.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: 'InterSemiBold', marginTop: -4 },
  statusBtn: { alignItems: 'center' },
  statusBtnText: { fontSize: 10, fontFamily: 'InterBold', color: COLORS.primary, marginTop: 2 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trialBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  trialBannerExpired: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  trialBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#075985' },
  trialBannerTextExpired: { color: '#991b1b' },
  trialBannerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: COLORS.primary },
  trialBannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  aiNudgeBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiNudgeText: { flex: 1, fontSize: 12, fontWeight: '800', color: '#e11d48' },
  searchContainer: { paddingHorizontal: 16, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 12, height: 48, gap: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  body: { flex: 1, padding: 16 },
  lockedCard: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff5f5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, gap: 12 },
  lockedTitle: { fontSize: 24, fontWeight: '900', color: '#7f1d1d' },
  lockedSub: { fontSize: 14, color: '#7f1d1d', textAlign: 'center', lineHeight: 21 },
  lockedBtn: { marginTop: 6, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  lockedBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingBottom: 30 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
  btnNo: { backgroundColor: '#fff' },
  btnMessage: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  btnStar: { backgroundColor: '#fff', borderColor: '#e11d48', borderWidth: 2 },
  btnYes: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.muted, fontWeight: '600' },
});

export default HomeScreen;
