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
  ScrollView,
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
import { Heart, MapPin, SlidersHorizontal, Star, X, PlayCircle, MessageCircle, Crown, Rocket } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import ProfileBadges from '../../components/ProfileBadges';
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';

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
  distance_km?: number | null;
};

type SwipeResponse = {
  matched: boolean;
  matchId?: string | null;
};

type MatchModalState = {
  user: Suggestion;
  matchId: string;
};

type LikeInboxRow = {
  liker_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRIGGER_DISTANCE = 110;
const TRIAL_DAYS = 7;
const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();

const isSkuNotFoundError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('sku was not found')
    || message.includes('fetch products first')
    || message.includes('getitem')
    || message.includes('getitems');
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trialLocked, setTrialLocked] = useState(false);
  const [matchModal, setMatchModal] = useState<MatchModalState | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFemaleOfferDetails, setShowFemaleOfferDetails] = useState(false);
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [availableProductIds, setAvailableProductIds] = useState<Set<string>>(new Set());
  const [likesInboxCount, setLikesInboxCount] = useState(0);

  const [filters, setFilters] = useState({
    gender: 'ALL',
    minAge: 18,
    maxAge: 50,
    city: '',
    maxDistanceKm: 100,
  });

  const swipePosition = useRef(new Animated.ValueXY()).current;

  const loadAndroidConsumables = useCallback(async (): Promise<Set<string>> => {
    if (Platform.OS !== 'android' || isExpoGo) return new Set();
    const skus = [SUPER_LIKE_SKU];
    const products: any[] = await IAP.getProducts({ skus });
    const ids = new Set((products || []).map((item) => String(item?.productId || item?.sku || '')).filter(Boolean));
    setAvailableProductIds(ids);
    return ids;
  }, []);

  const trialInfo = useMemo(() => {
    const isMale = currentUser?.gender === 'MALE';
    if (!isMale || currentUser?.isPremium || !currentUser?.trial_started_at) {
      return { eligible: false, active: false, daysRemaining: 0 };
    }

    const startedAt = new Date(currentUser.trial_started_at).getTime();
    if (!Number.isFinite(startedAt)) {
      return { eligible: true, active: false, daysRemaining: 0 };
    }

    const trialEndTs = startedAt + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const remainingMs = trialEndTs - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
    return { eligible: true, active: remainingMs > 0, daysRemaining };
  }, [currentUser?.gender, currentUser?.isPremium, currentUser?.trial_started_at]);

  const isFemaleFreePlan = useMemo(() => {
    return String(currentUser?.gender || '').toUpperCase() === 'FEMALE' && !currentUser?.isPremium;
  }, [currentUser?.gender, currentUser?.isPremium]);

  useEffect(() => {
    if (trialInfo.eligible && !trialInfo.active) {
      setTrialLocked(true);
    }
  }, [trialInfo]);

  useEffect(() => {
    if (isExpoGo) return;
    IAP.initConnection()
      .then(async () => {
        if (Platform.OS === 'android') {
          try { await IAP.flushFailedPurchasesCachedAsPendingAndroid(); } catch {}
        }
        await loadAndroidConsumables().catch(() => {});
      })
      .catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, [loadAndroidConsumables]);

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        gender: filters.gender,
        minAge: String(filters.minAge),
        maxAge: String(filters.maxAge),
        maxDistanceKm: String(filters.maxDistanceKm),
      });
      if (filters.city.trim()) {
        params.set('city', filters.city.trim());
      }
      const query = `?${params.toString()}`;
      const response = await apiRequest<{ suggestions: Suggestion[] }>(`/api/matchmaking/suggestions${query}`, { requireAuth: true });
      setSuggestions(response.suggestions || []);
      setTrialLocked(false);
    } catch (error: any) {
      if (String(error?.message || '').includes('subscription_required')) {
        setTrialLocked(true);
      }
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters]);

  const fetchLikesInboxCount = useCallback(async () => {
    if (!currentUser) return;
    if (!currentUser.isPremium) {
      setLikesInboxCount(0);
      return;
    }
    try {
      const payload = await apiRequest<LikeInboxRow[]>('/api/likes/received', { requireAuth: true });
      const rows = Array.isArray(payload) ? payload : [];
      const pendingCount = rows.filter((row) => !row?.liked_back && !row?.is_matched).length;
      setLikesInboxCount(pendingCount);
    } catch {
      setLikesInboxCount(0);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      void fetchSuggestions();
      void fetchLikesInboxCount();
    }, [fetchSuggestions, fetchLikesInboxCount])
  );

  const handleSwipe = async (direction: 'LEFT' | 'RIGHT', isSuper = false, targetProfile = suggestions[0]) => {
    if (!targetProfile || swiping) return;
    try {
      setSwiping(true);
      const response = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: targetProfile.id, direction, isSuperLike: isSuper })
      });
      if (response.matched && response.matchId) {
        setMatchModal({ user: targetProfile, matchId: response.matchId });
      }
      setSuggestions(prev => prev.filter(p => p.id !== targetProfile.id));
    } catch (e: any) {
      if (isSuper && e.message === 'premium_required_for_super_like') {
        setShowSuperLikeModal(true);
      } else if (String(e?.message || '').includes('subscription_required')) {
        setTrialLocked(true);
        Alert.alert('Essai expiré', 'Passez à Premium pour continuer à utiliser cette fonctionnalité.');
      } else {
        Alert.alert('Info', e.message);
      }
    } finally {
      setSwiping(false);
    }
  };

  const handleSuperLikePurchasePaystack = async () => {
    if (!suggestions[0]) return;
    try {
      setPurchaseLoading(true);
      await initiatePurchase('SUPER_LIKE', parseInt(process.env.EXPO_PUBLIC_SUPER_LIKE_AMOUNT || '500'), suggestions[0].id);
      setShowSuperLikeModal(false);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleSuperLikePurchaseGoogle = async () => {
    if (!suggestions[0]) return;
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }
    try {
      setPurchaseLoading(true);
      let resolvedIds = availableProductIds;
      if (Platform.OS === 'android' && !resolvedIds.has(SUPER_LIKE_SKU)) {
        resolvedIds = await loadAndroidConsumables();
      }
      if (Platform.OS === 'android' && !resolvedIds.has(SUPER_LIKE_SKU)) {
        Alert.alert(
          'Erreur Google Play',
          `Le produit Super Like (${SUPER_LIKE_SKU}) n'est pas disponible sur Google Play pour ce build. Vérifie l'ID produit, l'activation et le compte testeur.`
        );
        return;
      }
      const requestPayload = Platform.select({
        ios: { sku: SUPER_LIKE_SKU },
        android: { skus: [SUPER_LIKE_SKU] },
      }) as any;

      const requestPurchaseWithRetry = async () => {
        try {
          return await IAP.requestPurchase(requestPayload);
        } catch (error: any) {
          if (Platform.OS === 'android' && isSkuNotFoundError(error)) {
            const refreshedIds = await loadAndroidConsumables();
            if (!refreshedIds.has(SUPER_LIKE_SKU)) {
              throw new Error(`Le produit ${SUPER_LIKE_SKU} reste introuvable sur Google Play.`);
            }
            return await IAP.requestPurchase(requestPayload);
          }
          throw error;
        }
      };

      const purchase: any = await requestPurchaseWithRetry();
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
        await apiRequest(verifyPath, {
          method: 'POST',
          body: JSON.stringify({
            productId: purchaseItem.productId,
            type: 'SUPER_LIKE',
            targetId: suggestions[0].id,
            purchaseToken: purchaseItem.purchaseToken,
            transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
          }),
          requireAuth: true,
        });
        await IAP.finishTransaction({ purchase: purchaseItem, isConsumable: true });
        Alert.alert('Succès', 'Super Like envoyé !');
        setShowSuperLikeModal(false);
        void fetchSuggestions();
      }
    } catch (err: any) {
      if (err.code !== 'E_USER_CANCELLED') {
        if (Platform.OS === 'android' && isSkuNotFoundError(err)) {
          Alert.alert(
            'Erreur Google Play',
            `SKU introuvable pour Super Like (${SUPER_LIKE_SKU}). Vérifie que le produit est actif, que l'app vient du Play Store (track test/prod) et que le compte testeur est bien autorisé.`
          );
        } else {
          Alert.alert('Erreur', err.message);
        }
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const initiatePurchase = async (type: string, amount: number, targetId?: string) => {
    try {
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          body: JSON.stringify({ amount, type, targetId, paymentMethod: 'MOBILE_MONEY' }),
          requireAuth: true
        }
      );
      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);
      const verify = await apiRequest<{ status: string }>(
        `/api/payments/verify?reference=${init.reference}`,
        { requireAuth: true }
      );
      if (verify.status === 'active') {
        Alert.alert('Succès', 'Action confirmée !');
        void fetchSuggestions();
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
    onPanResponderMove: (_, gs) => swipePosition.setValue({ x: gs.dx, y: gs.dy }),
    onPanResponderRelease: (_, gs) => {
      if (gs.dx > SWIPE_TRIGGER_DISTANCE) {
        Animated.timing(swipePosition, { toValue: { x: SCREEN_WIDTH * 1.5, y: gs.dy }, duration: 200, useNativeDriver: true }).start(() => {
          swipePosition.setValue({ x: 0, y: 0 });
          handleSwipe('RIGHT');
        });
      } else if (gs.dx < -SWIPE_TRIGGER_DISTANCE) {
        Animated.timing(swipePosition, { toValue: { x: -SCREEN_WIDTH * 1.5, y: gs.dy }, duration: 200, useNativeDriver: true }).start(() => {
          swipePosition.setValue({ x: 0, y: 0 });
          handleSwipe('LEFT');
        });
      } else {
        Animated.spring(swipePosition, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    }
  }), [suggestions]);

  const currentProfile = suggestions[0];

  const openDirectMessage = () => {
    if (!currentProfile) return;
    if (trialLocked) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('Chat', { userId: currentProfile.id });
  };

  const openStatuses = () => {
    if (trialLocked) {
      Alert.alert('Essai expiré', 'Passez à Premium pour accéder de nouveau aux stories.');
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('Status');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Yamo</Text>
          <Text style={styles.subtitle}>Découvre de nouvelles personnes</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.statusBtn} onPress={openStatuses}>
            <PlayCircle color={COLORS.primary} size={28} />
            <Text style={styles.statusBtnText}>Stories</Text>
          </Pressable>
          <Pressable style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal color={COLORS.ink} size={20} />
          </Pressable>
        </View>
      </View>

      {trialInfo.eligible ? (
        <View style={[styles.trialBanner, !trialInfo.active && styles.trialBannerExpired]}>
          <Text style={[styles.trialBannerText, !trialInfo.active && styles.trialBannerTextExpired]}>
            {trialInfo.active
              ? `Essai gratuit actif • ${trialInfo.daysRemaining} jour(s) restant(s)`
              : 'Essai gratuit expiré • Passez à Premium pour réactiver les fonctionnalités'}
          </Text>
          {!trialInfo.active ? (
            <Pressable style={styles.trialBannerBtn} onPress={() => navigation.navigate('Premium')}>
              <Text style={styles.trialBannerBtnText}>Premium</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.quickActions}>
        <Pressable style={styles.quickActionBtn} onPress={() => navigation.navigate('Premium')}>
          <View style={styles.quickActionRow}>
            <View style={styles.quickActionIconWrap}>
              <Crown color="#b45309" size={14} />
            </View>
            <Text style={styles.quickActionTitle}>Abonnements</Text>
          </View>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => navigation.navigate('Boost')}>
          <View style={styles.quickActionRow}>
            <View style={styles.quickActionIconWrap}>
              <Rocket color="#0ea5e9" size={14} />
            </View>
            <Text style={styles.quickActionTitle}>Boosts</Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.quickActionBtn}
          onPress={() => {
            if (!currentUser?.isPremium) {
              Alert.alert('Premium requis', 'Passez à Premium pour voir qui vous a liké.');
              navigation.navigate('Premium');
              return;
            }
            navigation.navigate('LikesInbox');
          }}
        >
          <View style={styles.quickActionRow}>
            <View style={styles.quickActionIconWrap}>
              <Heart color="#dc2626" size={14} />
            </View>
            <Text style={styles.quickActionTitle}>Likes reçus</Text>
            {likesInboxCount > 0 ? (
              <View style={styles.quickActionCountPill}>
                <Text style={styles.quickActionCountText}>{likesInboxCount}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>

      {isFemaleFreePlan ? (
        <View style={styles.offerBanner}>
          <Text style={styles.offerBannerTitle}>Votre offre actuelle</Text>
          <Text style={styles.offerBannerSub}>Forfait gratuit</Text>
          <Pressable style={styles.offerBannerBtn} onPress={() => setShowFemaleOfferDetails(true)}>
            <Text style={styles.offerBannerBtnText}>Voir les détails</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ flex: 1 }} />
        ) : trialLocked ? (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Essai terminé</Text>
            <Text style={styles.lockedSub}>
              Votre période d'essai de 7 jours est expirée. Passez à Premium pour reprendre la découverte, le chat et les stories.
            </Text>
            <Pressable style={styles.lockedBtn} onPress={() => navigation.navigate('Premium')}>
              <Text style={styles.lockedBtnText}>Passer à Premium</Text>
            </Pressable>
          </View>
        ) : currentProfile ? (
          <Animated.View
            style={[styles.card, { transform: [{ translateX: swipePosition.x }, { rotate: swipePosition.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-10deg', '0deg', '10deg'] }) }] }]}
            {...panResponder.panHandlers}
          >
            <ImageBackground source={{ uri: currentProfile.photos[0] }} style={styles.cardImage} imageStyle={{ borderRadius: 24 }}>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                  {currentProfile.super_liked_me ? (
                    <View style={styles.superLikeReceivedPill}>
                      <Star size={12} color="#fff" fill="#fff" />
                      <Text style={styles.superLikeReceivedPillText}>Super Like reçu</Text>
                    </View>
                  ) : null}
                  <ProfileBadges user={currentProfile} />
                </View>
                <View style={styles.locRow}>
                  <MapPin size={14} color="#fff" />
                  <Text style={styles.locText}>
                    {currentProfile.city || 'À proximité'}
                    {typeof currentProfile.distance_km === 'number' ? ` • ${currentProfile.distance_km.toFixed(1)} km` : ''}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </Animated.View>
        ) : (
          <View style={styles.empty}><Text style={styles.emptyText}>Plus de profils pour le moment.</Text></View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, styles.btnNo]} onPress={() => handleSwipe('LEFT')}><X color={COLORS.primary} size={28} /></Pressable>
        <Pressable style={[styles.actionBtn, styles.btnMessage]} onPress={openDirectMessage}>
          <MessageCircle color="#fff" size={24} />
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.btnStar]} onPress={() => handleSwipe('RIGHT', true)}><Star color="#fff" size={24} fill="#fff" /></Pressable>
        <Pressable style={[styles.actionBtn, styles.btnYes]} onPress={() => handleSwipe('RIGHT')}><Heart color="#fff" size={30} fill="#fff" /></Pressable>
      </View>

      {/* @ts-ignore */}
      <SuperLikePurchaseModal
        visible={showSuperLikeModal}
        onClose={() => setShowSuperLikeModal(false)}
        onPurchasePaystack={handleSuperLikePurchasePaystack}
        onPurchaseGoogle={handleSuperLikePurchaseGoogle}
        loading={purchaseLoading}
        userName={currentProfile?.name}
      />

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filterContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres de recherche</Text>
              <Pressable onPress={() => setShowFilters(false)}><X size={24} color={COLORS.ink} /></Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Je veux voir</Text>
              <View style={styles.filterRow}>
                {['MALE', 'FEMALE', 'ALL'].map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.filterChip, filters.gender === g && styles.filterChipActive]}
                    onPress={() => setFilters({ ...filters, gender: g })}
                  >
                    <Text style={[styles.filterChipText, filters.gender === g && styles.filterChipTextActive]}>
                      {g === 'MALE' ? 'Hommes' : g === 'FEMALE' ? 'Femmes' : 'Tous'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterLabel}>Âge : {filters.minAge} - {filters.maxAge} ans</Text>
              <View style={styles.ageInputs}>
                <TextInput
                  style={styles.ageInput}
                  keyboardType="numeric"
                  value={String(filters.minAge)}
                  onChangeText={(v) => setFilters({ ...filters, minAge: parseInt(v) || 18 })}
                  placeholder="Min"
                />
                <Text style={styles.ageDash}>à</Text>
                <TextInput
                  style={styles.ageInput}
                  keyboardType="numeric"
                  value={String(filters.maxAge)}
                  onChangeText={(v) => setFilters({ ...filters, maxAge: parseInt(v) || 50 })}
                  placeholder="Max"
                />
              </View>

              <Text style={styles.filterLabel}>Ville</Text>
              <TextInput
                style={styles.textInput}
                value={filters.city}
                onChangeText={(v) => setFilters({ ...filters, city: v })}
                placeholder="Ex: Abidjan"
                autoCapitalize="words"
              />

              <Text style={styles.filterLabel}>Distance max : {filters.maxDistanceKm} km</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={String(filters.maxDistanceKm)}
                onChangeText={(v) => setFilters({ ...filters, maxDistanceKm: Math.max(1, parseInt(v, 10) || 1) })}
                placeholder="Ex: 50"
              />

              <Pressable style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showFemaleOfferDetails} transparent animationType="fade" onRequestClose={() => setShowFemaleOfferDetails(false)}>
        <View style={styles.offerDetailsOverlay}>
          <View style={styles.offerDetailsCard}>
            <View style={styles.offerDetailsHeader}>
              <Text style={styles.offerDetailsTitle}>Forfait gratuit (femmes)</Text>
              <Pressable onPress={() => setShowFemaleOfferDetails(false)}>
                <X size={20} color={COLORS.ink} />
              </Pressable>
            </View>

            <Text style={styles.offerDetailsSectionTitle}>Inclus gratuitement</Text>
            <Text style={styles.offerDetailsLine}>• Découverte des profils</Text>
            <Text style={styles.offerDetailsLine}>• Likes et matchs</Text>
            <Text style={styles.offerDetailsLine}>• Stories</Text>
            <Text style={styles.offerDetailsLine}>• Messages avec les profils déjà matchés</Text>

            <Text style={[styles.offerDetailsSectionTitle, { marginTop: 12 }]}>Fonctionnalités payantes</Text>
            <Text style={styles.offerDetailsLine}>• Message direct hors match (achat ponctuel)</Text>
            <Text style={styles.offerDetailsLine}>• Super Like (achat ponctuel)</Text>
            <Text style={styles.offerDetailsLine}>• Boost profil (achat ponctuel)</Text>
            <Text style={styles.offerDetailsLine}>• Abonnement Premium</Text>

            <Text style={[styles.offerDetailsSectionTitle, { marginTop: 12 }]}>Abonnement Premium (femmes)</Text>
            <Text style={styles.offerDetailsLine}>• Jusqu'à 10 Super Likes gratuits par jour</Text>
            <Text style={styles.offerDetailsLine}>• Mode invisible inclus selon le forfait Premium choisi</Text>
            <Text style={styles.offerDetailsLine}>• Badge Premium affiché sur le profil</Text>
            <Text style={styles.offerDetailsLine}>• Accès continu aux avantages Premium tant que l'abonnement est actif</Text>
          </View>
        </View>
      </Modal>

      {matchModal && (
        <Modal visible transparent animationType="fade">
          <View style={styles.matchOverlay}>
            <Text style={styles.matchTitle}>C'est un Match !</Text>
            <Text style={styles.matchSub}>Vous et {matchModal.user.name} vous plaisez.</Text>
            <Pressable
              style={styles.matchBtn}
              onPress={() => {
                const { user, matchId } = matchModal;
                setMatchModal(null);
                navigation.navigate('Chat', { userId: user.id, matchId });
              }}
            >
              <Text style={styles.matchBtnText}>Continuer</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  brand: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  subtitle: { fontSize: 12, color: COLORS.muted },
  statusBtn: { alignItems: 'center' },
  statusBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  trialBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trialBannerExpired: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  trialBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#075985' },
  trialBannerTextExpired: { color: '#991b1b' },
  trialBannerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  trialBannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 2,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: { color: COLORS.ink, fontSize: 11, fontWeight: '900' },
  quickActionCountPill: {
    marginLeft: 'auto',
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  offerBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offerBannerTitle: {
    color: '#9f1239',
    fontSize: 11,
    fontWeight: '900',
  },
  offerBannerSub: {
    flex: 1,
    color: '#4c0519',
    fontSize: 11,
    fontWeight: '700',
  },
  offerBannerBtn: {
    borderRadius: 999,
    backgroundColor: '#e11d48',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  offerBannerBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 16 },
  lockedCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 12,
  },
  lockedTitle: { fontSize: 24, fontWeight: '900', color: '#7f1d1d' },
  lockedSub: { fontSize: 14, color: '#7f1d1d', textAlign: 'center', lineHeight: 21 },
  lockedBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  lockedBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  card: { flex: 1, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardImage: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  cardInfo: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: '#fff', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  superLikeReceivedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.92)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  superLikeReceivedPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { color: '#fff', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingBottom: 30 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
  btnNo: { borderColor: '#f1f5f9' },
  btnMessage: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  btnStar: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  btnYes: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.muted, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.ink },
  filterLabel: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 12, marginTop: 16, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontWeight: '700', color: COLORS.muted },
  filterChipTextActive: { color: '#fff' },
  ageInputs: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ageInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  textInput: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '600', color: COLORS.ink },
  ageDash: { fontWeight: '700', color: COLORS.muted },
  applyBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  matchOverlay: { flex: 1, backgroundColor: 'rgba(255,107,107,0.95)', justifyContent: 'center', alignItems: 'center', gap: 20 },
  matchTitle: { fontSize: 42, fontWeight: '900', color: '#fff' },
  matchSub: { fontSize: 18, color: '#fff', textAlign: 'center', paddingHorizontal: 40 },
  matchBtn: { backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  matchBtnText: { color: COLORS.primary, fontWeight: '900', fontSize: 16 },
  offerDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  offerDetailsCard: {
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  offerDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  offerDetailsTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  offerDetailsSectionTitle: {
    color: '#7f1d1d',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  offerDetailsLine: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
});

export default HomeScreen;
