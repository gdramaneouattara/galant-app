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
import { Heart, MapPin, SlidersHorizontal, Star, X, PlayCircle } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
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
  score: number;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRIGGER_DISTANCE = 110;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { currentUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [matchUser, setMatchUser] = useState<Suggestion | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const [filters, setFilters] = useState({
    gender: 'ALL',
    minAge: 18,
    maxAge: 50,
  });

  const swipePosition = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    IAP.initConnection().catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const query = `?gender=${filters.gender}&minAge=${filters.minAge}&maxAge=${filters.maxAge}`;
      const response = await apiRequest<{ suggestions: Suggestion[] }>(`/api/matchmaking/suggestions${query}`, { requireAuth: true });
      setSuggestions(response.suggestions || []);
    } catch (_error) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters]);

  useFocusEffect(
    useCallback(() => {
      void fetchSuggestions();
    }, [fetchSuggestions])
  );

  const handleSwipe = async (direction: 'LEFT' | 'RIGHT', isSuper = false, targetProfile = suggestions[0]) => {
    if (!targetProfile || swiping) return;
    try {
      setSwiping(true);
      const response = await apiRequest<{ matched: boolean }>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: targetProfile.id, direction, isSuperLike: isSuper })
      });
      if (response.matched) setMatchUser(targetProfile);
      setSuggestions(prev => prev.filter(p => p.id !== targetProfile.id));
    } catch (e: any) {
      if (isSuper && e.message === 'premium_required_for_super_like') {
        setShowSuperLikeModal(true);
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
    try {
      setPurchaseLoading(true);
      // @ts-ignore
      const purchase: any = await IAP.requestPurchase('super_like_1');
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        await apiRequest('/api/payments/google-verify', {
          method: 'POST',
          body: JSON.stringify({
            purchaseToken: purchaseItem.purchaseToken,
            productId: purchaseItem.productId,
            type: 'SUPER_LIKE',
            targetId: suggestions[0].id
          }),
          requireAuth: true,
        });
        Alert.alert('Succès', 'Super Like envoyé !');
        setShowSuperLikeModal(false);
        void fetchSuggestions();
      }
    } catch (err: any) {
      if (err.code !== 'E_USER_CANCELLED') Alert.alert('Erreur', err.message);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const initiatePurchase = async (type: string, amount: number, targetId?: string) => {
    try {
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        { method: 'POST', body: JSON.stringify({ amount, type, targetId }), requireAuth: true }
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Yamo</Text>
          <Text style={styles.subtitle}>Découvre de nouvelles personnes</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.statusBtn} onPress={() => navigation.navigate('Status')}>
            <PlayCircle color={COLORS.primary} size={28} />
            <Text style={styles.statusBtnText}>Stories</Text>
          </Pressable>
          <Pressable style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal color={COLORS.ink} size={20} />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ flex: 1 }} />
        ) : currentProfile ? (
          <Animated.View
            style={[styles.card, { transform: [{ translateX: swipePosition.x }, { rotate: swipePosition.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-10deg', '0deg', '10deg'] }) }] }]}
            {...panResponder.panHandlers}
          >
            <ImageBackground source={{ uri: currentProfile.photos[0] }} style={styles.cardImage} imageStyle={{ borderRadius: 24 }}>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                  <ProfileBadges user={currentProfile} />
                </View>
                <View style={styles.locRow}>
                  <MapPin size={14} color="#fff" />
                  <Text style={styles.locText}>{currentProfile.city || 'À proximité'}</Text>
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

              <Pressable style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {matchUser && (
        <Modal visible transparent animationType="fade">
          <View style={styles.matchOverlay}>
            <Text style={styles.matchTitle}>C'est un Match !</Text>
            <Text style={styles.matchSub}>Vous et {matchUser.name} vous plaisez.</Text>
            <Pressable style={styles.matchBtn} onPress={() => setMatchUser(null)}>
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
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 16 },
  card: { flex: 1, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardImage: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  cardInfo: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: '#fff', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { color: '#fff', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingBottom: 30 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
  btnNo: { borderColor: '#f1f5f9' },
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
  ageDash: { fontWeight: '700', color: COLORS.muted },
  applyBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  matchOverlay: { flex: 1, backgroundColor: 'rgba(255,107,107,0.95)', justifyContent: 'center', alignItems: 'center', gap: 20 },
  matchTitle: { fontSize: 42, fontWeight: '900', color: '#fff' },
  matchSub: { fontSize: 18, color: '#fff', textAlign: 'center', paddingHorizontal: 40 },
  matchBtn: { backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  matchBtnText: { color: COLORS.primary, fontWeight: '900', fontSize: 16 }
});

export default HomeScreen;
