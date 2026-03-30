import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, MapPin, ShieldAlert, ShieldBan, SlidersHorizontal, Star, X } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import ProfileBadges from '../../components/ProfileBadges';

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
  last_active_at?: string | null;
  likes_count: number;
  relationship_goal?: string | null;
  score: number;
  liked_by_me: boolean;
  liked_me: boolean;
  super_liked_me: boolean;
  distance_km: number | null;
};

type MatchmakingResponse = {
  suggestions: Suggestion[];
};

type SwipeResponse = {
  liked: boolean;
  superLiked: boolean;
  matched: boolean;
  likeQuota?: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
  } | null;
};

type ReportCategory =
  | 'ABUSE'
  | 'INAPPROPRIATE'
  | 'NUDITY'
  | 'HATE'
  | 'VIOLENCE'
  | 'SCAM'
  | 'SPAM'
  | 'IMPERSONATION'
  | 'FAKE_PROFILE'
  | 'UNDERAGE'
  | 'OTHER';

type StatusFilter = 'ALL' | 'VERIFIED' | 'UNVERIFIED' | 'PREMIUM' | 'FREE';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'Tous' },
  { value: 'VERIFIED', label: 'Vérifiés' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'FREE', label: 'Gratuits' },
];

const REPORT_CATEGORIES: Array<{ value: ReportCategory; label: string }> = [
  { value: 'ABUSE', label: 'Abus / Harcelement' },
  { value: 'INAPPROPRIATE', label: 'Contenu inapproprie' },
  { value: 'NUDITY', label: 'Nudite / contenu sexuel' },
  { value: 'HATE', label: 'Discours haineux' },
  { value: 'VIOLENCE', label: 'Violence / menaces' },
  { value: 'SCAM', label: 'Arnaque / Fraude' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'IMPERSONATION', label: "Usurpation d'identite" },
  { value: 'FAKE_PROFILE', label: 'Faux profil / tromperie' },
  { value: 'UNDERAGE', label: 'Mineur' },
  { value: 'OTHER', label: 'Autre' },
];

const DISTANCE_FILTERS = [25, 50, 100, 200];
const SWIPE_TRIGGER_DISTANCE = 110;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CITY_SUGGESTIONS = [
  'Douala',
  'Yaounde',
  'Abidjan',
  'Dakar',
  'Lome',
  'Cotonou',
  'Paris',
  'Bruxelles',
];

type LikeQuota = {
  isPremium: boolean;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resetAt: string | null;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [matchUser, setMatchUser] = useState<Suggestion | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [interestInput, setInterestInput] = useState('');
  const [showSafetySheet, setShowSafetySheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('ABUSE');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [likeQuota, setLikeQuota] = useState<LikeQuota | null>(null);
  const [likeQuotaLoading, setLikeQuotaLoading] = useState(false);

  const [minAge, setMinAge] = useState(21);
  const [maxAge, setMaxAge] = useState(40);
  const [distanceKm, setDistanceKm] = useState(100);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [cityMatchMode, setCityMatchMode] = useState<'contains' | 'exact'>('contains');

  const isPremium = currentUser?.isPremium === true;
  const swipePosition = useRef(new Animated.ValueXY()).current;
  const seenProfileIdsRef = useRef<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '40');
      params.set('min_age', String(minAge));
      params.set('max_age', String(maxAge));
      params.set('distance_km', String(distanceKm));
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const parsedInterests = interestInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (parsedInterests.length > 0) {
        params.set('interests', parsedInterests.join(','));
      }

      const normalizedCity = cityFilter.trim();
      if (normalizedCity) {
        params.set('city', normalizedCity);
        params.set('city_mode', cityMatchMode);
      }
      const normalizedCountry = countryFilter.trim();
      if (normalizedCountry) {
        params.set('country', normalizedCountry);
      }

      const response = await apiRequest<MatchmakingResponse>(
        `/api/matchmaking/suggestions?${params.toString()}`,
        { requireAuth: true }
      );
      setSuggestions(response.suggestions || []);
    } catch (_error) {
      setSuggestions([]);
    } finally {
      setLoading(false);
      setSwiping(false);
    }
  }, [currentUser, minAge, maxAge, distanceKm, statusFilter, interestInput, cityFilter, countryFilter, cityMatchMode]);

  const fetchLikeQuota = useCallback(async () => {
    if (!currentUser || isPremium) return;
    try {
      setLikeQuotaLoading(true);
      const data = await apiRequest<LikeQuota>('/api/likes/quota', { requireAuth: true });
      setLikeQuota(data);
    } catch (_error) {
      setLikeQuota(null);
    } finally {
      setLikeQuotaLoading(false);
    }
  }, [currentUser, isPremium]);

  useFocusEffect(
    useCallback(() => {
      void fetchSuggestions();
      void fetchLikeQuota();
    }, [fetchSuggestions, fetchLikeQuota])
  );

  const currentProfile = suggestions[0] || null;

  const handleSwipe = async (
    direction: 'LEFT' | 'RIGHT',
    superLike = false,
    targetProfile: Suggestion | null = currentProfile
  ) => {
    if (!targetProfile || swiping) return;

    if (direction === 'RIGHT' && superLike && !isPremium) {
      navigation.navigate('Premium');
      return;
    }

    try {
      setSwiping(true);
      const response = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          targetUserId: targetProfile.id,
          direction,
          isSuperLike: direction === 'RIGHT' ? superLike : false,
        }),
      });

      if (response.matched) {
        setMatchUser(targetProfile);
      }

      if (response.likeQuota) {
        setLikeQuota({
          isPremium: false,
          limit: response.likeQuota.limit,
          used: response.likeQuota.used,
          remaining: response.likeQuota.remaining,
          resetAt: response.likeQuota.resetAt,
        });
      }

      setSuggestions((prev) => prev.filter((profile) => profile.id !== targetProfile.id));
    } catch (error: any) {
      if (error?.message === 'daily_like_limit_reached') {
        const limit = likeQuota?.limit ?? 10;
        Alert.alert(
          'Limite de likes atteinte',
          `Tu as atteint ${limit} likes gratuits aujourd'hui. Passe Premium pour des likes illimités.`,
          [
            { text: 'Voir Premium', onPress: () => navigation.navigate('Premium') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Erreur', error?.message || 'Impossible d\u2019envoyer le like.');
      }
      setSwiping(false);
    } finally {
      setSwiping(false);
    }
  };

  const openSafetyActions = () => {
    if (!currentProfile) return;
    setShowSafetySheet(true);
  };

  const blockCurrentProfile = async () => {
    if (!currentProfile) return;
    Alert.alert(
      'Bloquer cet utilisateur',
      'Le blocage supprime le match et empeche les futurs messages.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest('/api/moderation/block', {
                method: 'POST',
                requireAuth: true,
                body: JSON.stringify({
                  blockedUserId: currentProfile.id,
                  reason: 'blocked_from_discover',
                }),
              });
              setSuggestions((prev) => prev.filter((profile) => profile.id !== currentProfile.id));
              setShowSafetySheet(false);
              Alert.alert('Utilisateur bloque', 'Ce profil ne vous sera plus propose.');
            } catch (error: any) {
              Alert.alert('Erreur', error?.message || 'Impossible de bloquer cet utilisateur.');
            }
          },
        },
      ]
    );
  };

  const submitReport = async () => {
    if (!currentProfile) return;
    const description = reportDescription.trim();
    if (!description) {
      Alert.alert('Description requise', 'Explique pourquoi tu signales ce profil.');
      return;
    }

    if (reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await apiRequest('/api/moderation/report', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          reportedUserId: currentProfile.id,
          targetType: 'PROFILE',
          category: reportCategory,
          description,
        }),
      });
      setShowReportModal(false);
      setShowSafetySheet(false);
      setReportDescription('');
      Alert.alert('Signalement envoye', 'Merci, notre equipe va analyser ce profil.');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de signaler cet utilisateur.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const resetCardPosition = useCallback(() => {
    Animated.spring(swipePosition, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  }, [swipePosition]);

  const animateAndSubmitSwipe = useCallback(
    (direction: 'LEFT' | 'RIGHT') => {
      if (!currentProfile || swiping) return;
      const targetProfile = currentProfile;
      const toX = direction === 'LEFT' ? -SCREEN_WIDTH * 1.2 : SCREEN_WIDTH * 1.2;

      Animated.timing(swipePosition, {
        toValue: { x: toX, y: 0 },
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        swipePosition.setValue({ x: 0, y: 0 });
        void handleSwipe(direction, false, targetProfile);
      });
    },
    [currentProfile, swiping, swipePosition, handleSwipe]
  );

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => (
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
      ),
      onPanResponderMove: (_evt, gestureState) => {
        swipePosition.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (!currentProfile || swiping) {
          resetCardPosition();
          return;
        }
        if (gestureState.dx >= SWIPE_TRIGGER_DISTANCE) {
          animateAndSubmitSwipe('RIGHT');
          return;
        }
        if (gestureState.dx <= -SWIPE_TRIGGER_DISTANCE) {
          animateAndSubmitSwipe('LEFT');
          return;
        }
        resetCardPosition();
      },
      onPanResponderTerminate: resetCardPosition,
    }),
    [currentProfile, swiping, swipePosition, resetCardPosition, animateAndSubmitSwipe]
  );

  const swipeRotation = swipePosition.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (!currentProfile || seenProfileIdsRef.current.has(currentProfile.id)) return;
    seenProfileIdsRef.current.add(currentProfile.id);
    void apiRequest('/api/matchmaking/view-profile', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ targetUserId: currentProfile.id }),
    }).catch(() => {});
  }, [currentProfile]);

  const headerSubtitle = useMemo(() => {
    if (!currentUser) return '';
    if (isPremium) return 'Suggestions intelligentes avec filtres avancés.';
    return 'Suggestions personnalisées selon votre profil.';
  }, [currentUser, isPremium]);

  const likeQuotaText = useMemo(() => {
    if (isPremium) return 'Likes illimités actifs.';
    if (likeQuotaLoading) return 'Chargement des likes restants...';
    if (!likeQuota || likeQuota.remaining === null || likeQuota.limit === null) {
      return 'Likes gratuits: limite journalière en cours.';
    }
    if (likeQuota.remaining <= 0) {
      const resetAt = likeQuota.resetAt
        ? new Date(likeQuota.resetAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : 'demain';
      return `Limite atteinte · reprise à ${resetAt}`;
    }
    return `Likes gratuits restants aujourd'hui: ${likeQuota.remaining}/${likeQuota.limit}`;
  }, [isPremium, likeQuota, likeQuotaLoading]);

  const likeQuotaBadge = useMemo(() => {
    if (isPremium) return { text: 'Premium · illimités', tone: 'premium' };
    if (likeQuotaLoading) return { text: 'Likes · ...', tone: 'loading' };
    if (!likeQuota || likeQuota.remaining === null || likeQuota.limit === null) {
      return { text: 'Likes · quota', tone: 'loading' };
    }
    if (likeQuota.remaining <= 0) {
      return { text: 'Limite atteinte', tone: 'danger' };
    }
    const used = likeQuota.used ?? (likeQuota.limit - likeQuota.remaining);
    return { text: `Likes ${likeQuota.remaining}/${likeQuota.limit}`, tone: used >= likeQuota.limit * 0.7 ? 'warn' : 'ok' };
  }, [isPremium, likeQuota, likeQuotaLoading]);

  if (!currentUser) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Découvrir</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
          <View style={[styles.likeBadge, styles[`likeBadge_${likeQuotaBadge.tone}` as const]]}>
            <Text style={styles.likeBadgeText}>{likeQuotaBadge.text}</Text>
          </View>
          {!isPremium ? <Text style={styles.likeQuota}>{likeQuotaText}</Text> : null}
        </View>
        <Pressable style={styles.filterButton} onPress={() => setShowFilters((prev) => !prev)}>
          <SlidersHorizontal color={COLORS.ink} size={18} />
          <Text style={styles.filterButtonText}>Filtres</Text>
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filtersCard}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Age min/max</Text>
            <View style={styles.ageRow}>
              <Pressable onPress={() => setMinAge((value) => Math.max(18, value - 1))} style={styles.adjustButton}>
                <Text style={styles.adjustText}>-</Text>
              </Pressable>
              <Text style={styles.filterValue}>{minAge}</Text>
              <Pressable onPress={() => setMinAge((value) => Math.min(maxAge, value + 1))} style={styles.adjustButton}>
                <Text style={styles.adjustText}>+</Text>
              </Pressable>
              <Text style={styles.separator}>/</Text>
              <Pressable onPress={() => setMaxAge((value) => Math.max(minAge, value - 1))} style={styles.adjustButton}>
                <Text style={styles.adjustText}>-</Text>
              </Pressable>
              <Text style={styles.filterValue}>{maxAge}</Text>
              <Pressable onPress={() => setMaxAge((value) => Math.min(99, value + 1))} style={styles.adjustButton}>
                <Text style={styles.adjustText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Distance</Text>
            <View style={styles.chipsRow}>
              {DISTANCE_FILTERS.map((distance) => (
                <Pressable
                  key={distance}
                  style={[styles.chip, distanceKm === distance && styles.chipActive]}
                  onPress={() => setDistanceKm(distance)}
                >
                  <Text style={[styles.chipText, distanceKm === distance && styles.chipTextActive]}>{distance} km</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Statut</Text>
            <View style={styles.chipsRow}>
              {STATUS_FILTERS.map((item) => (
                <Pressable
                  key={item.value}
                  style={[styles.chip, statusFilter === item.value && styles.chipActive]}
                  onPress={() => setStatusFilter(item.value)}
                >
                  <Text style={[styles.chipText, statusFilter === item.value && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Centres d’intérêt (virgule)</Text>
            <TextInput
              value={interestInput}
              onChangeText={setInterestInput}
              placeholder="musique, sport, voyage"
              style={styles.input}
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Ville (optionnel)</Text>
            <TextInput
              value={cityFilter}
              onChangeText={setCityFilter}
              placeholder="Douala, Yaounde, Paris..."
              style={styles.input}
            />
            <View style={styles.chipsRow}>
              {CITY_SUGGESTIONS.map((city) => (
                <Pressable
                  key={city}
                  style={[styles.chip, cityFilter === city && styles.chipActive]}
                  onPress={() => setCityFilter(city)}
                >
                  <Text style={[styles.chipText, cityFilter === city && styles.chipTextActive]}>{city}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.chipsRow}>
              {(['contains', 'exact'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.chip, cityMatchMode === mode && styles.chipActive]}
                  onPress={() => setCityMatchMode(mode)}
                >
                  <Text style={[styles.chipText, cityMatchMode === mode && styles.chipTextActive]}>
                    {mode === 'contains' ? 'Contient' : 'Exacte'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Pays (optionnel)</Text>
            <TextInput
              value={countryFilter}
              onChangeText={setCountryFilter}
              placeholder="Cameroun, France..."
              style={styles.input}
            />
          </View>


          <Pressable style={styles.applyButton} onPress={() => void fetchSuggestions()}>
            <Text style={styles.applyButtonText}>Appliquer les filtres</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.emptyText}>Chargement des suggestions...</Text>
          </View>
        ) : currentProfile ? (
          <Animated.View
            style={[
              styles.card,
              {
                transform: [
                  { translateX: swipePosition.x },
                  { rotate: swipeRotation },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <ImageBackground
              source={{ uri: currentProfile.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&auto=format&fit=crop' }}
              style={styles.cardImage}
              imageStyle={styles.cardImageRadius}
            >
              <View style={styles.cardOverlay} />
              <View style={styles.cardTopActions}>
                <Pressable style={styles.cardActionButton} onPress={openSafetyActions}>
                  <ShieldAlert color="#f59e0b" size={18} />
                </Pressable>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                  <ProfileBadges
                    user={{
                      ...currentProfile,
                      isVerified: currentProfile.is_verified,
                      last_active_at: currentProfile.last_active_at,
                      likes_count: currentProfile.likes_count
                    } as any}
                  />
                  {currentProfile.super_liked_me ? <Star color="#facc15" size={18} fill="#facc15" /> : null}
                </View>
                <View style={styles.locationRow}>
                  <MapPin color={COLORS.secondary} size={14} />
                  <Text style={styles.locationText}>
                    {currentProfile.city || 'Ville non renseignée'}
                    {typeof currentProfile.distance_km === 'number' ? ` • ${currentProfile.distance_km.toFixed(1)} km` : ''}
                  </Text>
                </View>
                {currentProfile.bio ? <Text style={styles.bio}>{currentProfile.bio}</Text> : null}
                <View style={styles.interests}>
                  {(currentProfile.interests || []).slice(0, 6).map((interest) => (
                    <View key={interest} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.hintsRow}>
                  <Text style={styles.hintPill}>Glissez à gauche/droite</Text>
                  {currentProfile.liked_me ? <Text style={styles.hintPill}>Vous a liké</Text> : null}
                  {currentProfile.is_premium ? <Text style={styles.hintPill}>Premium</Text> : null}
                  {currentProfile.relationship_goal ? <Text style={styles.hintPill}>{currentProfile.relationship_goal}</Text> : null}
                </View>
              </View>
            </ImageBackground>
          </Animated.View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun profil avec ces filtres.</Text>
            <Pressable style={styles.reloadButton} onPress={() => void fetchSuggestions()}>
              <Text style={styles.reloadButtonText}>Recharger</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            swipePosition.setValue({ x: 0, y: 0 });
            void handleSwipe('LEFT');
          }}
          style={[styles.actionBtn, styles.actionNo]}
          disabled={!currentProfile || swiping}
        >
          <X color={COLORS.primary} size={28} />
        </Pressable>
        <Pressable
          onPress={() => {
            swipePosition.setValue({ x: 0, y: 0 });
            void handleSwipe('RIGHT', true);
          }}
          style={[styles.actionBtn, styles.actionSuper, !isPremium && styles.actionLocked]}
          disabled={!currentProfile || swiping}
        >
          <Star color={isPremium ? '#fff' : '#fbbf24'} size={24} fill={isPremium ? '#fff' : 'transparent'} />
        </Pressable>
        <Pressable
          onPress={() => {
            swipePosition.setValue({ x: 0, y: 0 });
            void handleSwipe('RIGHT');
          }}
          style={[styles.actionBtn, styles.actionYes]}
          disabled={!currentProfile || swiping}
        >
          <Heart color="#fff" size={30} fill="#fff" />
        </Pressable>
      </View>

      <Modal
        visible={showSafetySheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSafetySheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Actions</Text>
            <Pressable
              style={styles.sheetButton}
              onPress={() => {
                setShowSafetySheet(false);
                setShowReportModal(true);
              }}
            >
              <ShieldAlert color="#f59e0b" size={18} />
              <Text style={styles.sheetButtonText}>Signaler ce profil</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetButton, styles.sheetButtonDanger]}
              onPress={() => void blockCurrentProfile()}
            >
              <ShieldBan color="#b91c1c" size={18} />
              <Text style={[styles.sheetButtonText, styles.sheetButtonDangerText]}>Bloquer ce profil</Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setShowSafetySheet(false)}>
              <Text style={styles.sheetCancelText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.sheetTitle}>Signaler un profil</Text>
            <View style={styles.reportCategories}>
              {REPORT_CATEGORIES.map((category) => {
                const active = category.value === reportCategory;
                return (
                  <Pressable
                    key={category.value}
                    style={[styles.reportChip, active && styles.reportChipActive]}
                    onPress={() => setReportCategory(category.value)}
                  >
                    <Text style={[styles.reportChipText, active && styles.reportChipTextActive]}>
                      {category.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Decris le probleme..."
              placeholderTextColor="#94a3b8"
              multiline
              style={styles.reportInput}
            />
            <Pressable
              style={[styles.reportSubmit, reportSubmitting && styles.reportSubmitDisabled]}
              onPress={() => void submitReport()}
              disabled={reportSubmitting}
            >
              <Text style={styles.reportSubmitText}>
                {reportSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
              </Text>
            </Pressable>
            <Pressable style={styles.sheetCancel} onPress={() => setShowReportModal(false)}>
              <Text style={styles.sheetCancelText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!matchUser} transparent animationType="fade" onRequestClose={() => setMatchUser(null)}>
        <View style={styles.matchOverlay}>
          <View style={styles.matchCard}>
            <Text style={styles.matchTitle}>C'est un match</Text>
            <Text style={styles.matchSubtitle}>{matchUser?.name} vous a aussi liké.</Text>
            <View style={styles.matchActions}>
              <Pressable style={styles.matchSecondary} onPress={() => setMatchUser(null)}>
                <Text style={styles.matchSecondaryLabel}>Continuer</Text>
              </Pressable>
              <Pressable
                style={styles.matchPrimary}
                onPress={() => {
                  setMatchUser(null);
                  navigation.navigate('MainTabs');
                }}
              >
                <Text style={styles.matchPrimaryLabel}>Voir messages</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  likeQuota: {
    color: COLORS.ink,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  likeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  likeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  likeBadge_ok: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  likeBadge_warn: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  likeBadge_danger: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  likeBadge_premium: {
    backgroundColor: '#ede9fe',
    borderColor: '#c4b5fd',
  },
  likeBadge_loading: {
    backgroundColor: '#e2e8f0',
    borderColor: '#cbd5e1',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  filtersCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  filterRow: {
    gap: 6,
  },
  filterLabel: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  adjustButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  adjustText: {
    fontWeight: '800',
    color: COLORS.ink,
  },
  filterValue: {
    minWidth: 24,
    textAlign: 'center',
    color: COLORS.ink,
    fontWeight: '800',
  },
  separator: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: '#7dd3fc',
    backgroundColor: '#e0f2fe',
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#0369a1',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.ink,
    backgroundColor: '#fff',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardImageRadius: {
    borderRadius: 28,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardTopActions: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
  },
  cardActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  cardInfo: {
    padding: 16,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: '#fff',
    fontSize: 12,
  },
  bio: {
    color: '#f1f5f9',
    fontSize: 13,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  interestText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  hintsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hintPill: {
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  emptyCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  reloadButton: {
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  reloadButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  actionBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionNo: {
    backgroundColor: '#fff',
  },
  actionSuper: {
    backgroundColor: '#f59e0b',
  },
  actionYes: {
    backgroundColor: COLORS.primary,
  },
  actionLocked: {
    backgroundColor: '#fff7ed',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheetCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  sheetButtonDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  sheetButtonDangerText: {
    color: '#b91c1c',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  reportCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  reportCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  reportChipActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fff7ed',
  },
  reportChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reportChipTextActive: {
    color: '#b45309',
  },
  reportInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    color: COLORS.ink,
    backgroundColor: '#f8fafc',
    textAlignVertical: 'top',
  },
  reportSubmit: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  reportSubmitDisabled: {
    opacity: 0.7,
  },
  reportSubmitText: {
    color: '#fff',
    fontWeight: '800',
  },
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  matchCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  matchSubtitle: {
    color: COLORS.ink,
  },
  matchActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  matchSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  matchSecondaryLabel: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  matchPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  matchPrimaryLabel: {
    color: '#fff',
    fontWeight: '800',
  },
});

export default HomeScreen;
