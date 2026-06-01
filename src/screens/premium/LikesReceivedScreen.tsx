import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as IAP from 'react-native-iap';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Check, Heart, Star, X } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';

type SuperLikeStatus = 'PENDING' | 'ACCEPTED' | 'IGNORED';

type SuperLikeRow = {
  id: string;
  sender_id: string;
  status: SuperLikeStatus;
  created_at: string;
  responded_at?: string | null;
  price_amount: number;
  currency: string;
  profiles?: {
    name: string;
    photos: string[];
    age: number;
    bio: string;
  };
  user: {
    id: string;
    name: string;
    age: number;
    gender: string;
    city: string | null;
    country: string | null;
    bio: string;
    photos: string[];
    interests: string[];
    is_verified: boolean;
    is_premium: boolean;
    relationship_goal: string | null;
  };
};

type SwipeResponse = {
  matched?: boolean;
  matchId?: string | null;
};

const STATUS_PRIORITY: Record<SuperLikeStatus, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  IGNORED: 2,
};

const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();

const isSkuNotFoundError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('sku was not found')
    || message.includes('fetch products first')
    || message.includes('getitem')
    || message.includes('getitems');
};

const LikesReceivedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [superLikes, setSuperLikes] = useState<SuperLikeRow[]>([]);
  const [selectedSuperLike, setSelectedSuperLike] = useState<SuperLikeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [superLikingId, setSuperLikingId] = useState<string | null>(null);
  const [likedUserIds, setLikedUserIds] = useState<Set<string>>(new Set());
  const [superLikedUserIds, setSuperLikedUserIds] = useState<Set<string>>(new Set());
  const [showSuperLikePurchaseModal, setShowSuperLikePurchaseModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [availableProductIds, setAvailableProductIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadAndroidConsumables = useCallback(async (): Promise<Set<string>> => {
    if (Platform.OS !== 'android' || isExpoGo) return new Set();
    const products: any[] = await IAP.getProducts({ skus: [SUPER_LIKE_SKU] });
    const ids = new Set((products || []).map((item) => String(item?.productId || item?.sku || '')).filter(Boolean));
    setAvailableProductIds(ids);
    return ids;
  }, []);

  useEffect(() => {
    if (isExpoGo) return;
    IAP.initConnection()
      .then(() => loadAndroidConsumables().catch(() => {}))
      .catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, [loadAndroidConsumables]);

  const fetchSuperLikes = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<SuperLikeRow[]>('/api/super-likes/received', {
        requireAuth: true,
      });
      const data = Array.isArray(payload) ? payload : [];
      const sortedRows = data.map(item => ({
        ...item,
        user: item.profiles ? {
          ...item.user,
          name: item.profiles.name,
          photos: item.profiles.photos,
          age: item.profiles.age,
          bio: item.profiles.bio
        } : item.user
      })).sort((left, right) => {
        const leftStatus = left.status as SuperLikeStatus;
        const rightStatus = right.status as SuperLikeStatus;
        const statusDelta = STATUS_PRIORITY[leftStatus] - STATUS_PRIORITY[rightStatus];
        if (statusDelta !== 0) return statusDelta;
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
      setSuperLikes(sortedRows);
      setError(null);
    } catch (err: any) {
      setSuperLikes([]);
      setError(err?.message || 'Impossible de charger les Super Likes reçus.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchSuperLikes();
    }, [fetchSuperLikes])
  );

  const promptOpenChat = (row: SuperLikeRow, matchId?: string | null) => {
    Alert.alert(
      'Match 🎉',
      `Vous et ${row.user.name} vous plaisez mutuellement. Ouvrir le chat ?`,
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Ouvrir le chat',
          onPress: () => navigation.navigate('Chat', { userId: row.user.id, matchId: matchId || undefined }),
        },
      ]
    );
  };

  const respondToSuperLike = async (row: SuperLikeRow, action: 'ACCEPT' | 'IGNORE') => {
    if (respondingId) return;

    try {
      setRespondingId(row.id);
      const payload = await apiRequest<any>(`/api/super-likes/${row.id}/respond`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ action }),
      });

      if (action === 'IGNORE') {
        setSuperLikes((prev) => prev.filter((item) => item.id !== row.id));
        if (selectedSuperLike?.id === row.id) {
          setSelectedSuperLike(null);
        }
        return;
      }

      const nextRows: SuperLikeRow[] = superLikes.map((item) => (
        item.id === row.id
          ? {
            ...item,
            status: action === 'ACCEPT' ? 'ACCEPTED' : 'IGNORED',
            responded_at: new Date().toISOString(),
          }
          : item
      ));

      nextRows.sort((left, right) => {
        const leftStatus = left.status as SuperLikeStatus;
        const rightStatus = right.status as SuperLikeStatus;
        const statusDelta = STATUS_PRIORITY[leftStatus] - STATUS_PRIORITY[rightStatus];
        if (statusDelta !== 0) return statusDelta;
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });

      setSuperLikes(nextRows);

      if (selectedSuperLike?.id === row.id) {
        setSelectedSuperLike({
          ...selectedSuperLike,
          status: payload.superLike.status,
          responded_at: payload.superLike.responded_at,
        });
      }

      Alert.alert(
        'Super Like accepté',
        "Le profil reste dans votre boîte dédiée. Aucun chat n'est ouvert automatiquement."
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de traiter ce Super Like.');
    } finally {
      setRespondingId(null);
    }
  };

  const likeProfile = async (row: SuperLikeRow) => {
    const targetUserId = row?.user?.id;
    if (!targetUserId || likingId) return;
    try {
      setLikingId(targetUserId);
      const payload = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          targetUserId,
          direction: 'RIGHT',
        }),
      });
      setLikedUserIds((prev) => {
        const next = new Set(prev);
        next.add(targetUserId);
        return next;
      });
      if (payload?.matched) {
        promptOpenChat(row, payload?.matchId || null);
      } else {
        Alert.alert('Like envoyé', `Votre like a été envoyé à ${row.user.name}.`);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de liker ce profil pour le moment.');
    } finally {
      setLikingId(null);
    }
  };

  const sendPaidSuperLikeAndTryMatch = async (row: SuperLikeRow) => {
    const targetUserId = row?.user?.id;
    if (!targetUserId) return;
    let payload = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        targetUserId,
        direction: 'RIGHT',
        isSuperLike: true,
      }),
    });

    if (!payload?.matched && row.status === 'PENDING') {
      try {
        const acceptPayload = await apiRequest<any>(`/api/super-likes/${row.id}/respond`, {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ action: 'ACCEPT' }),
        });
        setSuperLikes((prev) => prev.map((item) => (
          item.id === row.id
            ? {
              ...item,
              status: 'ACCEPTED',
              responded_at: acceptPayload?.superLike?.responded_at || new Date().toISOString(),
            }
            : item
        )));
        if (selectedSuperLike?.id === row.id) {
          setSelectedSuperLike((prev) => (
            prev ? { ...prev, status: 'ACCEPTED', responded_at: acceptPayload?.superLike?.responded_at || new Date().toISOString() } : prev
          ));
        }
        payload = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({
            targetUserId,
            direction: 'RIGHT',
            isSuperLike: true,
          }),
        });
      } catch {
        // keep default behavior if auto-accept/retry fails
      }
    }

    setSuperLikedUserIds((prev) => {
      const next = new Set(prev);
      next.add(targetUserId);
      return next;
    });
    if (payload?.matched) {
      promptOpenChat(row, payload?.matchId || null);
    } else {
      Alert.alert('Super Like envoyé', `Votre Super Like a été envoyé à ${row.user.name}.`);
    }
  };

  const handleSuperLikePurchasePaystack = async (row: SuperLikeRow) => {
    const targetUserId = row?.user?.id;
    if (!targetUserId || purchaseLoading || superLikingId) return;
    try {
      setPurchaseLoading(true);
      setSuperLikingId(targetUserId);
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          body: JSON.stringify({
            amount: parseInt(process.env.EXPO_PUBLIC_SUPER_LIKE_AMOUNT || '500', 10),
            type: 'SUPER_LIKE',
            targetId: targetUserId,
            paymentMethod: 'MOBILE_MONEY',
          }),
          requireAuth: true,
        }
      );
      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);
      const verify = await apiRequest<{ status: string }>(`/api/payments/verify?reference=${init.reference}`, { requireAuth: true });
      if (verify.status === 'active') {
        await sendPaidSuperLikeAndTryMatch(row);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d’envoyer un Super Like pour le moment.');
    } finally {
      setPurchaseLoading(false);
      setSuperLikingId(null);
      setShowSuperLikePurchaseModal(false);
    }
  };

  const handleSuperLikePurchaseGoogle = async (row: SuperLikeRow) => {
    const targetUserId = row?.user?.id;
    if (!targetUserId || purchaseLoading || superLikingId) return;
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }
    try {
      setPurchaseLoading(true);
      setSuperLikingId(targetUserId);
      let resolvedIds = availableProductIds;
      if (Platform.OS === 'android' && !resolvedIds.has(SUPER_LIKE_SKU)) {
        resolvedIds = await loadAndroidConsumables();
      }
      if (Platform.OS === 'android' && !resolvedIds.has(SUPER_LIKE_SKU)) {
        Alert.alert('Erreur Google Play', `Le produit Super Like (${SUPER_LIKE_SKU}) n'est pas disponible pour ce build.`);
        return;
      }
      const purchasePayload = Platform.select({
        ios: { sku: SUPER_LIKE_SKU },
        android: { skus: [SUPER_LIKE_SKU] },
      }) as any;
      const purchase: any = await IAP.requestPurchase(purchasePayload);
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
        await apiRequest(verifyPath, {
          method: 'POST',
          body: JSON.stringify({
            productId: purchaseItem.productId,
            type: 'SUPER_LIKE',
            targetId: targetUserId,
            purchaseToken: purchaseItem.purchaseToken,
            transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
          }),
          requireAuth: true,
        });
        await IAP.finishTransaction({ purchase: purchaseItem, isConsumable: true });
        await sendPaidSuperLikeAndTryMatch(row);
      }
    } catch (err: any) {
      if (err?.code !== 'E_USER_CANCELLED') {
        if (Platform.OS === 'android' && isSkuNotFoundError(err)) {
          Alert.alert('Erreur Google Play', `SKU introuvable pour Super Like (${SUPER_LIKE_SKU}).`);
        } else {
          Alert.alert('Erreur', err?.message || 'Achat Google Play non finalisé.');
        }
      }
    } finally {
      setPurchaseLoading(false);
      setSuperLikingId(null);
      setShowSuperLikePurchaseModal(false);
    }
  };

  const renderStatusPill = (status: SuperLikeStatus) => {
    if (status === 'ACCEPTED') {
      return (
        <View style={[styles.statusPill, styles.statusPillAccepted]}>
          <Text style={[styles.statusPillText, styles.statusPillTextAccepted]}>Accepté</Text>
        </View>
      );
    }
    if (status === 'IGNORED') {
      return (
        <View style={[styles.statusPill, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.statusPillText, { color: '#64748b' }]}>Ignoré</Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusPill, styles.statusPillPending]}>
        <Text style={[styles.statusPillText, styles.statusPillTextPending]}>En attente</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Boîte Super Likes</Text>
            <Text style={styles.subtitle}>Les profils reçus restent séparés des matchs et des messages.</Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.hint}>Chargement...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : superLikes.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.hint}>Aucun Super Like reçu pour le moment.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {superLikes.map((row) => (
              <View key={row.id} style={styles.card}>
                <Image
                  source={{
                    uri:
                      row.user.photos?.[0]
                      || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&auto=format&fit=crop',
                  }}
                  style={styles.photo}
                />
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{row.user.name}, {row.user.age}</Text>
                    <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    {renderStatusPill(row.status)}
                  </View>
                  <Text style={styles.meta}>{row.user.city || 'Ville non renseignée'}</Text>
                  <Text style={styles.meta}>Reçu le {new Date(row.created_at).toLocaleString('fr-FR')}</Text>
                  <Text style={styles.meta}>Tarif payé : {row.price_amount} {row.currency}</Text>
                  <View style={styles.actionsRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => setSelectedSuperLike(row)}>
                      <Text style={styles.secondaryButtonText}>Ouvrir fiche</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.likeButton,
                        likedUserIds.has(row.user.id) && styles.likeButtonDone,
                        likingId === row.user.id && styles.buttonDisabled,
                      ]}
                      onPress={() => { void likeProfile(row); }}
                      disabled={likedUserIds.has(row.user.id) || likingId === row.user.id}
                    >
                      <Heart size={16} color="#fff" fill="#fff" />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.superLikePaidButton,
                        superLikedUserIds.has(row.user.id) && styles.superLikePaidButtonDone,
                        superLikingId === row.user.id && styles.buttonDisabled,
                      ]}
                      onPress={() => {
                        setSelectedSuperLike(row);
                        setShowSuperLikePurchaseModal(true);
                      }}
                      disabled={superLikedUserIds.has(row.user.id) || superLikingId === row.user.id}
                    >
                      <Star size={16} color="#fff" fill="#fff" />
                    </Pressable>
                    {row.status === 'PENDING' ? (
                      <>
                        <Pressable
                          style={[styles.primaryButton, respondingId === row.id && styles.buttonDisabled]}
                          onPress={() => { void respondToSuperLike(row, 'ACCEPT'); }}
                          disabled={respondingId === row.id}
                        >
                          <Text style={styles.primaryButtonText}>{respondingId === row.id ? '...' : 'Accepter'}</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.ghostDangerButton, respondingId === row.id && styles.buttonDisabled]}
                          onPress={() => { void respondToSuperLike(row, 'IGNORE'); }}
                          disabled={respondingId === row.id}
                        >
                          <Text style={styles.ghostDangerButtonText}>Ignorer</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedSuperLike}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSuperLike(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalClose} onPress={() => setSelectedSuperLike(null)}>
              <X size={18} color="#64748b" />
            </Pressable>
            {selectedSuperLike ? (
              <>
                <Image
                  source={{
                    uri:
                      selectedSuperLike.user.photos?.[0]
                      || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&auto=format&fit=crop',
                  }}
                  style={styles.modalPhoto}
                />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalName}>
                    {selectedSuperLike.user.name}, {selectedSuperLike.user.age}
                  </Text>
                  {renderStatusPill(selectedSuperLike.status)}
                </View>
                <Text style={styles.modalMeta}>
                  {selectedSuperLike.user.city || 'Ville non renseignée'}
                  {selectedSuperLike.user.country ? `, ${selectedSuperLike.user.country}` : ''}
                </Text>
                {selectedSuperLike.user.relationship_goal ? (
                  <Text style={styles.modalGoal}>{selectedSuperLike.user.relationship_goal}</Text>
                ) : null}
                {selectedSuperLike.user.bio ? (
                  <Text style={styles.modalBio}>{selectedSuperLike.user.bio}</Text>
                ) : null}
                <View style={styles.tags}>
                  {(selectedSuperLike.user.interests || []).slice(0, 6).map((interest) => (
                    <Text key={interest} style={styles.tag}>{interest}</Text>
                  ))}
                </View>
                <Text style={styles.modalHint}>
                  Vous pouvez liker en retour ou envoyer un Super Like payant pour augmenter les chances de match et ouvrir le chat.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    style={[
                      styles.likeButton,
                      likedUserIds.has(selectedSuperLike.user.id) && styles.likeButtonDone,
                      likingId === selectedSuperLike.user.id && styles.buttonDisabled,
                    ]}
                    onPress={() => { void likeProfile(selectedSuperLike); }}
                    disabled={likedUserIds.has(selectedSuperLike.user.id) || likingId === selectedSuperLike.user.id}
                  >
                    <Heart size={18} color="#fff" fill="#fff" />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.superLikePaidButton,
                      superLikedUserIds.has(selectedSuperLike.user.id) && styles.superLikePaidButtonDone,
                      superLikingId === selectedSuperLike.user.id && styles.buttonDisabled,
                    ]}
                    onPress={() => setShowSuperLikePurchaseModal(true)}
                    disabled={superLikedUserIds.has(selectedSuperLike.user.id) || superLikingId === selectedSuperLike.user.id}
                  >
                    <Star size={16} color="#fff" fill="#fff" />
                  </Pressable>
                  {selectedSuperLike.status === 'PENDING' ? (
                    <>
                    <Pressable
                      style={[styles.primaryButton, respondingId === selectedSuperLike.id && styles.buttonDisabled]}
                      onPress={() => { void respondToSuperLike(selectedSuperLike, 'ACCEPT'); }}
                      disabled={respondingId === selectedSuperLike.id}
                    >
                      <Check size={16} color="#fff" />
                      <Text style={styles.primaryButtonText}>Accepter</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.ghostDangerButton, respondingId === selectedSuperLike.id && styles.buttonDisabled]}
                      onPress={() => { void respondToSuperLike(selectedSuperLike, 'IGNORE'); }}
                      disabled={respondingId === selectedSuperLike.id}
                    >
                      <Text style={styles.ghostDangerButtonText}>Ignorer</Text>
                    </Pressable>
                    </>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <SuperLikePurchaseModal
        visible={showSuperLikePurchaseModal}
        onClose={() => setShowSuperLikePurchaseModal(false)}
        onPurchasePaystack={() => {
          if (selectedSuperLike) void handleSuperLikePurchasePaystack(selectedSuperLike);
        }}
        onPurchaseGoogle={() => {
          if (selectedSuperLike) void handleSuperLikePurchaseGoogle(selectedSuperLike);
        }}
        loading={purchaseLoading}
        userName={selectedSuperLike?.user?.name}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  backButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  centered: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  hint: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    fontWeight: '700',
    textAlign: 'center',
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  photo: {
    width: 78,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontWeight: '800',
    color: COLORS.ink,
    fontSize: 15,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillPending: {
    backgroundColor: '#fef3c7',
  },
  statusPillAccepted: {
    backgroundColor: '#dcfce7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextPending: {
    color: '#b45309',
  },
  statusPillTextAccepted: {
    color: '#15803d',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeButtonDone: {
    backgroundColor: '#16a34a',
  },
  superLikePaidButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superLikePaidButtonDone: {
    backgroundColor: '#16a34a',
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  ghostDangerButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ghostDangerButtonText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  modalPhoto: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  modalName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
  },
  modalMeta: {
    color: COLORS.muted,
    fontSize: 13,
  },
  modalGoal: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5, fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  modalBio: {
    color: COLORS.ink,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  modalHint: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
});

export default LikesReceivedScreen;
