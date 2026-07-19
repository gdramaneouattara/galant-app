import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as IAP from 'react-native-iap';
import { ChevronLeft, Heart, MapPin, MessageCircle, Rocket, ShieldCheck, Star } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import ProfileBadges from '../../components/ProfileBadges';
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';
import DirectMessagePurchaseModal from '../../components/DirectMessagePurchaseModal';
import type { ProfileDetailParam, RootStackParamList } from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type SwipeResponse = {
  matched?: boolean;
  matchId?: string | null;
};

const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();
const DIRECT_MESSAGE_SKU = String(process.env.EXPO_PUBLIC_DIRECT_MESSAGE_SKU || 'direct_message_1').trim();
const PLACEHOLDER_PHOTO = 'https://placehold.co/900x1200';

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Homme',
  FEMALE: 'Femme',
  OTHER: 'Autre',
};

const RELATIONSHIP_GOAL_LABELS: Record<string, string> = {
  SERIOUS: 'Amour sérieux',
  FRIENDSHIP: 'Amitié',
  CASUAL: 'On verra bien',
};

const BoostedProfileDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const profile = route.params?.profile as ProfileDetailParam | undefined;
  const [liking, setLiking] = useState(false);
  const [superLiking, setSuperLiking] = useState(false);
  const [directMessageLoading, setDirectMessageLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showSuperLikePurchaseModal, setShowSuperLikePurchaseModal] = useState(false);
  const [showDirectMessagePurchaseModal, setShowDirectMessagePurchaseModal] = useState(false);
  const [availableProductIds, setAvailableProductIds] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const targetUserId = String(profile?.id || '').trim();
  const profilePhotos = (profile?.photos || []).filter((photo): photo is string => !!photo);
  const coverPhoto = selectedPhoto || profilePhotos[0] || PLACEHOLDER_PHOTO;
  const isBoosted = !!(profile?.boosted_until && new Date(profile.boosted_until) > new Date());
  const normalizedGender = String(profile?.gender || '').toUpperCase();
  const normalizedGoal = String(profile?.relationship_goal || '').toUpperCase();
  const genderLabel = GENDER_LABELS[normalizedGender] || profile?.gender || 'Non renseigné';
  const relationshipGoalLabel = RELATIONSHIP_GOAL_LABELS[normalizedGoal] || profile?.relationship_goal || 'Non renseigné';
  const ageLabel = typeof profile?.age === 'number' ? `${profile.age}` : null;

  const loadProducts = async (): Promise<Set<string>> => {
    if (Platform.OS !== 'android' || isExpoGo) return new Set();
    const skus = [SUPER_LIKE_SKU, DIRECT_MESSAGE_SKU];
    const products: any[] = await IAP.getProducts({ skus });
    const ids = new Set((products || []).map((item) => String(item?.productId || item?.sku || '')).filter(Boolean));
    setAvailableProductIds(ids);
    return ids;
  };

  useEffect(() => {
    if (isExpoGo) return;
    IAP.initConnection()
      .then(() => loadProducts().catch(() => {}))
      .catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, []);

  useEffect(() => {
    setSelectedPhoto(null);
  }, [targetUserId]);

  const sendLike = async () => {
    if (!targetUserId || liking) return;
    try {
      setLiking(true);
      const payload = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId, direction: 'RIGHT' }),
      });
      if (payload?.matched) {
        Alert.alert('Match 🎉', `Vous et ${profile?.name || 'ce profil'} vous plaisez mutuellement.`);
      } else {
        Alert.alert('Like envoyé', `Votre like a été envoyé à ${profile?.name || 'ce profil'}.`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', String(error?.message || 'Impossible d’envoyer le like pour le moment.'));
    } finally {
      setLiking(false);
    }
  };

  const sendSuperLike = async () => {
    if (!targetUserId || superLiking) return;
    try {
      setSuperLiking(true);
      const payload = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId, direction: 'RIGHT', isSuperLike: true }),
      });
      if (payload?.matched) {
        Alert.alert('Match 🎉', `Bouquet de roses envoyé. Vous et ${profile?.name || 'ce profil'} matchez !`);
      } else {
        Alert.alert('Bouquet de roses envoyé', `Votre bouquet de roses a été envoyé à ${profile?.name || 'ce profil'}.`);
      }
    } catch (error: any) {
      if (String(error?.message || '').includes('premium_required_for_super_like')) {
        setShowSuperLikePurchaseModal(true);
      } else {
        Alert.alert('Erreur', String(error?.message || 'Impossible d’envoyer le bouquet de roses.'));
      }
    } finally {
      setSuperLiking(false);
    }
  };

  const openDirectMessage = async () => {
    if (!targetUserId || directMessageLoading) return;
    try {
      setDirectMessageLoading(true);
      const response = await apiRequest<{ matchId: string; unlocked: boolean }>('/api/messages/direct-thread', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId }),
      });
      navigation.navigate('Chat', { userId: targetUserId, matchId: response?.matchId });
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('payment_required') || message.includes('subscription_required')) {
        setShowDirectMessagePurchaseModal(true);
      } else {
        Alert.alert('Erreur', message || 'Impossible d’ouvrir le message direct.');
      }
    } finally {
      setDirectMessageLoading(false);
    }
  };

  const initiatePurchasePaystack = async (
    type: 'SUPER_LIKE' | 'DIRECT_MESSAGE',
    targetId: string,
    onSuccess: () => void
  ) => {
    try {
      setPurchaseLoading(true);
      const init = await apiRequest<{ authorization_url: string; reference: string }>('/api/payments/initialize', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ type, targetId, paymentMethod: 'MOBILE_MONEY' }),
      });
      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);
      const verify = await apiRequest<{ status: string }>(`/api/payments/verify?reference=${init.reference}`, {
        requireAuth: true,
      });
      if (verify.status === 'active') {
        onSuccess();
      } else {
        Alert.alert('Paiement en attente', 'Le paiement est en cours de validation.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', String(error?.message || 'Paiement non finalisé.'));
    } finally {
      setPurchaseLoading(false);
    }
  };

  const requestGooglePurchase = async (
    sku: string,
    type: 'SUPER_LIKE' | 'DIRECT_MESSAGE',
    targetId: string,
    onSuccess: () => void
  ) => {
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }
    try {
      setPurchaseLoading(true);
      let resolvedIds = availableProductIds;
      if (Platform.OS === 'android' && !resolvedIds.has(sku)) {
        resolvedIds = await loadProducts();
      }
      if (Platform.OS === 'android' && !resolvedIds.has(sku)) {
        Alert.alert('Erreur Google Play', `Le produit (${sku}) n’est pas disponible pour ce build.`);
        return;
      }

      const purchasePayload = Platform.select({
        ios: { sku },
        android: { skus: [sku] },
      }) as any;
      const purchase: any = await IAP.requestPurchase(purchasePayload);
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (!purchaseItem) return;

      const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
      await apiRequest(verifyPath, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          productId: purchaseItem.productId,
          type,
          targetId,
          purchaseToken: purchaseItem.purchaseToken,
          transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
        }),
      });
      await IAP.finishTransaction({ purchase: purchaseItem, isConsumable: true });
      onSuccess();
    } catch (error: any) {
      if (error?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Erreur Google Play', String(error?.message || 'Achat non finalisé.'));
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleSuperLikePaystack = () => {
    if (!targetUserId) return;
    void initiatePurchasePaystack('SUPER_LIKE', targetUserId, () => {
      setShowSuperLikePurchaseModal(false);
      Alert.alert('Super Like envoyé', `Votre Super Like a été envoyé à ${profile?.name || 'ce profil'}.`);
    });
  };

  const handleSuperLikeGoogle = () => {
    if (!targetUserId) return;
    void requestGooglePurchase(SUPER_LIKE_SKU, 'SUPER_LIKE', targetUserId, () => {
      setShowSuperLikePurchaseModal(false);
      Alert.alert('Super Like envoyé', `Votre Super Like a été envoyé à ${profile?.name || 'ce profil'}.`);
    });
  };

  const handleDirectMessagePaystack = () => {
    if (!targetUserId) return;
    void initiatePurchasePaystack('DIRECT_MESSAGE', targetUserId, () => {
      setShowDirectMessagePurchaseModal(false);
      Alert.alert('Message direct débloqué', `Vous pouvez écrire à ${profile?.name || 'ce profil'}.`);
      navigation.navigate('Chat', { userId: targetUserId });
    });
  };

  const handleDirectMessageGoogle = () => {
    if (!targetUserId) return;
    void requestGooglePurchase(DIRECT_MESSAGE_SKU, 'DIRECT_MESSAGE', targetUserId, () => {
      setShowDirectMessagePurchaseModal(false);
      Alert.alert('Message direct débloqué', `Vous pouvez écrire à ${profile?.name || 'ce profil'}.`);
      navigation.navigate('Chat', { userId: targetUserId });
    });
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Profil introuvable.</Text>
          <Pressable style={styles.backButtonSolid} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonSolidText}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image source={{ uri: coverPhoto }} style={styles.heroImage} />
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft color="#fff" size={24} />
          </Pressable>
          <View style={styles.heroOverlay}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}{ageLabel ? `, ${ageLabel}` : ''}</Text>
              {!!profile.is_verified && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={13} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <MapPin size={14} color="#fff" />
              <Text style={styles.metaText}>
                {profile.city || 'Ville non renseignée'}
                {typeof profile.distance_km === 'number' ? ` • ${profile.distance_km.toFixed(1)} km` : ''}
              </Text>
            </View>
            <View style={styles.gardenBadgeInline}>
              <Text style={styles.gardenTextInline}>🌹 Jardin de {profile.roses_count || 0} Roses</Text>
            </View>
          </View>
          {isBoosted ? (
            <View style={styles.boostBadge}>
              <Rocket size={13} color="#fff" />
              <Text style={styles.boostBadgeText}>Boosté</Text>
            </View>
          ) : null}
        </View>

        {profilePhotos.length > 1 ? (
          <View style={styles.galleryCard}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {profilePhotos.map((photo, index) => {
                const active = photo === coverPhoto;
                return (
                  <Pressable
                    key={`${photo}-${index}`}
                    style={[styles.thumbnailWrap, active && styles.thumbnailWrapActive]}
                    onPress={() => setSelectedPhoto(photo)}
                  >
                    <Image source={{ uri: photo }} style={styles.thumbnail} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.card}>
          <ProfileBadges user={{ ...profile, is_verified: profile.is_verified, galanterie_score: profile.galanterie_score } as any} showLabels />
          <Text style={styles.sectionTitle}>Identité</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{profile.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Âge</Text>
              <Text style={styles.infoValue}>{ageLabel ? `${ageLabel} ans` : 'Non renseigné'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Genre</Text>
              <Text style={styles.infoValue}>{genderLabel}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Ville</Text>
              <Text style={styles.infoValue}>{profile.city || 'Non renseignée'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Pays</Text>
              <Text style={styles.infoValue}>{profile.country || 'Non renseigné'}</Text>
            </View>
            {typeof profile.distance_km === 'number' ? (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>{profile.distance_km.toFixed(1)} km</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Objectif de relation</Text>
          <View style={styles.goalCard}>
            <Text style={styles.goalText}>{relationshipGoalLabel}</Text>
          </View>

          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.bio}>{profile.bio || 'Ce membre n’a pas encore ajouté de bio.'}</Text>

          {profile.interests?.length ? (
            <>
              <Text style={styles.sectionTitle}>Centres d’intérêt</Text>
              <View style={styles.interestsWrap}>
                {profile.interests.map((interest) => (
                  <View key={interest} style={styles.interestPill}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Choisissez une interaction</Text>
          <Pressable style={[styles.actionButton, styles.likeButton]} onPress={sendLike} disabled={liking}>
            {liking ? <ActivityIndicator color="#fff" /> : <Heart size={20} color="#fff" fill="#fff" />}
            <Text style={styles.actionButtonText}>Envoyer un Like</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.superLikeButton]} onPress={sendSuperLike} disabled={superLiking}>
            {superLiking ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 20 }}>🌹</Text>}
            <Text style={styles.superLikeButtonText}>Envoyer une Rose</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.messageButton]} onPress={openDirectMessage} disabled={directMessageLoading}>
            {directMessageLoading ? <ActivityIndicator color="#fff" /> : <MessageCircle size={20} color="#fff" />}
            <Text style={styles.actionButtonText}>Message Direct</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SuperLikePurchaseModal
        visible={showSuperLikePurchaseModal}
        onClose={() => setShowSuperLikePurchaseModal(false)}
        onPurchasePaystack={handleSuperLikePaystack}
        onPurchaseGoogle={handleSuperLikeGoogle}
        loading={purchaseLoading}
        userName={profile.name}
        userInterests={profile.interests || []}
      />
      <DirectMessagePurchaseModal
        visible={showDirectMessagePurchaseModal}
        onClose={() => setShowDirectMessagePurchaseModal(false)}
        onPurchasePaystack={handleDirectMessagePaystack}
        onPurchaseGoogle={handleDirectMessageGoogle}
        loading={purchaseLoading}
        userName={profile.name}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6efeb' },
  content: { paddingBottom: 28 },
  hero: { height: 460, backgroundColor: '#111827' },
  heroImage: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    gap: 6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: '#fff', fontSize: 30, fontWeight: '900' },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  gardenBadgeInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  gardenTextInline: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '900',
  },
  boostBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8b5cf6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  boostBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  galleryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  gallery: {
    gap: 10,
    paddingRight: 4,
  },
  thumbnailWrap: {
    width: 78,
    height: 96,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  thumbnailWrapActive: {
    borderColor: COLORS.primary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.ink, marginTop: 4 },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 4,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  goalCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  goalText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  bio: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  interestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestPill: {
    backgroundColor: '#fef2f2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  interestText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  actionsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  actionsTitle: { fontSize: 17, fontWeight: '900', color: COLORS.ink, textAlign: 'center' },
  actionButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  likeButton: { backgroundColor: '#dc2626' },
  superLikeButton: { backgroundColor: '#fff', borderColor: '#e11d48', borderWidth: 2 },
  messageButton: { backgroundColor: '#2563eb' },
  actionButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  superLikeButtonText: { color: COLORS.ink, fontWeight: '900', fontSize: 15 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  emptyText: { color: COLORS.muted, fontWeight: '700' },
  backButtonSolid: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  backButtonSolidText: { color: '#fff', fontWeight: '900' },
});

export default BoostedProfileDetailScreen;
