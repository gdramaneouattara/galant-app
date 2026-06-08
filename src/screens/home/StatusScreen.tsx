import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, X, Play, Heart } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';
import VideoPlayer from '../../components/VideoPlayer';
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';
import DirectMessagePurchaseModal from '../../components/DirectMessagePurchaseModal';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';

interface Status {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  created_at: string;
  likes_count?: number;
  liked_by_me?: boolean;
  profiles: {
    id?: string;
    name: string;
    photos: string[];
  };
}

interface StatusLiker {
  user_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
  profile: {
    id: string;
    name: string;
    age?: number | null;
    gender?: string | null;
    city?: string | null;
    country?: string | null;
    bio?: string;
    photos: string[];
    interests: string[];
    is_verified?: boolean;
    is_premium?: boolean;
    relationship_goal?: string | null;
  };
}

const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();
const DIRECT_MESSAGE_SKU = String(process.env.EXPO_PUBLIC_DIRECT_MESSAGE_SKU || 'direct_message_1').trim();

const isSkuNotFoundError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('sku was not found')
    || message.includes('fetch products first')
    || message.includes('getitem')
    || message.includes('getitems');
};

const StatusScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, appResumeVersion } = useApp();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<Record<string, string>>({});
  const [likeLoadingByStatusId, setLikeLoadingByStatusId] = useState<Record<string, boolean>>({});
  const [likersModalVisible, setLikersModalVisible] = useState(false);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likers, setLikers] = useState<StatusLiker[]>([]);
  const [likerProfileModalVisible, setLikerProfileModalVisible] = useState(false);
  const [selectedLiker, setSelectedLiker] = useState<StatusLiker | null>(null);
  const [likingBackUserId, setLikingBackUserId] = useState<string | null>(null);
  const [showSuperLikePurchaseModal, setShowSuperLikePurchaseModal] = useState(false);
  const [showDirectMessagePurchaseModal, setShowDirectMessagePurchaseModal] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [availableProductIds, setAvailableProductIds] = useState<Set<string>>(new Set());

  const selectedStatus = statuses.find((item) => item.id === selectedStatusId) || null;

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiRequest<Status[]>('/api/statuses', { requireAuth: true });
      setStatuses(data || []);
      setLocked(false);

      // Hydrate signed URLs
      for (const s of (data || [])) {
        if (s.media_url && !resolvedUrls[s.media_url]) {
          const { data: urlData } = await supabase.storage.from('statuses').createSignedUrl(s.media_url, 3600);
          if (urlData?.signedUrl) {
            setResolvedUrls(prev => ({ ...prev, [s.media_url]: urlData.signedUrl }));
          }
        }
      }
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('subscription_required')) {
        setLocked(true);
        setStatuses([]);
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [resolvedUrls]);

  useEffect(() => {
    let cancelled = false;
    const buildVideoPreviews = async () => {
      for (const item of statuses) {
        if (item.message_type !== 'VIDEO') continue;
        const key = item.media_url;
        const sourceUrl = resolvedUrls[key];
        if (!key || !sourceUrl || videoPreviewUrls[key]) continue;
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(sourceUrl, { time: 1000 });
          if (!cancelled && uri) {
            setVideoPreviewUrls(prev => ({ ...prev, [key]: uri }));
          }
        } catch (_e) {
          // Keep fallback rendering below if thumbnail extraction fails.
        }
      }
    };

    void buildVideoPreviews();
    return () => {
      cancelled = true;
    };
  }, [statuses, resolvedUrls, videoPreviewUrls]);

  useEffect(() => {
    fetchStatuses();
  }, []);

  useEffect(() => {
    if (appResumeVersion > 0) {
      fetchStatuses();
    }
  }, [appResumeVersion]);

  const loadAndroidConsumables = useCallback(async (): Promise<Set<string>> => {
    if (Platform.OS !== 'android' || isExpoGo) return new Set();
    const skus = [SUPER_LIKE_SKU, DIRECT_MESSAGE_SKU];
    const products: any[] = await IAP.getProducts({ skus });
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

  const getPublishStatusErrorMessage = (error: any) => {
    const raw = String(error?.message || '').toLowerCase();
    if (raw.includes('subscription_required')) {
      return 'Publication réservée aux utilisateurs éligibles (essai actif ou premium).';
    }
    if (raw.includes('permission')) {
      return "Permission média refusée. Autorisez l'accès à la galerie.";
    }
    if (raw.includes('bucket') || raw.includes('storage') || raw.includes('row-level security') || raw.includes('rls')) {
      return 'Le stockage Stories n’est pas correctement autorisé (bucket/policies).';
    }
    return "Impossible de publier le statut.";
  };

  const pickStatusMedia = async () => {
    if (uploading) return;
    if (locked) {
      Alert.alert('Essai expiré', 'Passez à Premium pour publier des stories.');
      // @ts-ignore
      navigation.navigate('Premium');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour publier un statut.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const type = asset.type === 'video' ? 'VIDEO' : 'IMAGE';

      setUploading(true);
      try {
        const fileName = asset.fileName || uri.split('/').pop() || `${Date.now()}`;
        const fileExt = fileName.includes('.') ? fileName.split('.').pop() : (type === 'VIDEO' ? 'mp4' : 'jpg');
        const mimeType = asset.mimeType || (type === 'VIDEO' ? 'video/mp4' : 'image/jpeg');
        const path = `${currentUser?.id}/${Date.now()}.${fileExt}`;
        await uploadArrayBufferToBucket({
          bucket: 'statuses',
          path,
          uri,
          contentType: mimeType
        });

        await apiRequest('/api/statuses', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ mediaUrl: path, type, content: '' })
        });
        fetchStatuses();
      } catch (e: any) {
        Alert.alert('Erreur', getPublishStatusErrorMessage(e));
      } finally {
        setUploading(false);
      }
    }
  };

  const formatPublishedAt = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const timePart = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  const renderStatusItem = ({ item }: { item: Status }) => (
    <Pressable style={styles.statusCard} onPress={() => setSelectedStatusId(item.id)}>
      {item.message_type === 'VIDEO' ? (
        videoPreviewUrls[item.media_url] ? (
          <Image source={{ uri: videoPreviewUrls[item.media_url] }} style={styles.statusPreview} />
        ) : (
          <View style={[styles.statusPreview, styles.videoPreviewFallback]}>
            <Play size={26} color="#fff" fill="#fff" />
          </View>
        )
      ) : (
        <Image source={{ uri: resolvedUrls[item.media_url] || item.profiles.photos[0] }} style={styles.statusPreview} />
      )}
      <View style={styles.statusAuthorChip}>
        <Image
          source={{ uri: item.profiles.photos?.[0] || 'https://placehold.co/80x80' }}
          style={styles.statusAuthorAvatar}
        />
      </View>
      <Pressable
        style={[styles.statusLikeButton, item.liked_by_me ? styles.statusLikeButtonActive : null]}
        disabled={!!likeLoadingByStatusId[item.id] || String(item.user_id) === String(currentUser?.id)}
        onPress={(event) => {
          event.stopPropagation?.();
          void handleToggleLike(item);
        }}
      >
        <Heart
          size={13}
          color={item.liked_by_me ? '#22c55e' : '#ef4444'}
          fill={item.liked_by_me ? '#22c55e' : 'transparent'}
        />
        <Text style={styles.statusLikeCount}>{Number(item.likes_count || 0)}</Text>
      </Pressable>
      <View style={styles.statusInfo}>
        <View style={styles.statusMetaText}>
          <Text style={styles.statusName} numberOfLines={1}>{item.profiles.name}</Text>
          <Text style={styles.statusDateTime}>{formatPublishedAt(item.created_at)}</Text>
        </View>
        {item.message_type === 'VIDEO' && <Play size={12} color="#fff" fill="#fff" />}
      </View>
    </Pressable>
  );

  const patchStatusInList = (statusId: string, patch: Partial<Status>) => {
    setStatuses((prev) => prev.map((status) => (
      status.id === statusId ? { ...status, ...patch } : status
    )));
  };

  const handleToggleLike = async (status: Status) => {
    const statusId = String(status.id || '').trim();
    if (!statusId || !currentUser) return;
    if (String(status.user_id) === String(currentUser.id)) return;
    if (likeLoadingByStatusId[statusId]) return;

    const currentlyLiked = !!status.liked_by_me;
    const previousCount = Number(status.likes_count || 0);
    const optimisticCount = currentlyLiked ? Math.max(0, previousCount - 1) : previousCount + 1;
    patchStatusInList(statusId, {
      liked_by_me: !currentlyLiked,
      likes_count: optimisticCount,
    });

    setLikeLoadingByStatusId((prev) => ({ ...prev, [statusId]: true }));
    try {
      await apiRequest(`/api/statuses/${statusId}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
        requireAuth: true,
      });
    } catch (error: any) {
      patchStatusInList(statusId, {
        liked_by_me: currentlyLiked,
        likes_count: previousCount,
      });
      Alert.alert('Erreur', String(error?.message || 'Impossible de mettre à jour le like.'));
    } finally {
      setLikeLoadingByStatusId((prev) => {
        const next = { ...prev };
        delete next[statusId];
        return next;
      });
    }
  };

  const openLikersModal = async (status: Status) => {
    if (!currentUser) return;
    if (String(status.user_id) !== String(currentUser.id)) return;

    setLikersModalVisible(true);
    setLikersLoading(true);
    setLikers([]);

    try {
      const payload = await apiRequest<{ likes: StatusLiker[] }>(`/api/statuses/${status.id}/likes`, {
        requireAuth: true,
      });
      setLikers(payload?.likes || []);
    } catch (error: any) {
      Alert.alert('Erreur', String(error?.message || 'Impossible de charger les likes de la story.'));
      setLikers([]);
    } finally {
      setLikersLoading(false);
    }
  };

  const initiatePurchasePaystack = async (
    type: 'SUPER_LIKE' | 'DIRECT_MESSAGE',
    amount: number,
    targetId: string,
    successMessage: string,
    onSuccess?: () => void
  ) => {
    try {
      setPurchaseLoading(true);
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
        Alert.alert('Succès', successMessage);
        onSuccess?.();
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
    successMessage: string,
    onSuccess?: () => void
  ) => {
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }

    try {
      setPurchaseLoading(true);
      let resolvedIds = availableProductIds;
      if (Platform.OS === 'android' && !resolvedIds.has(sku)) {
        resolvedIds = await loadAndroidConsumables();
      }
      if (Platform.OS === 'android' && !resolvedIds.has(sku)) {
        Alert.alert('Erreur Google Play', `Le produit (${sku}) n'est pas disponible pour ce build.`);
        return;
      }

      const purchasePayload = Platform.select({
        ios: { sku },
        android: { skus: [sku] },
      }) as any;

      const purchase: any = await IAP.requestPurchase(purchasePayload);
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
        await apiRequest(verifyPath, {
          method: 'POST',
          body: JSON.stringify({
            productId: purchaseItem.productId,
            type,
            targetId,
            purchaseToken: purchaseItem.purchaseToken,
            transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
          }),
          requireAuth: true,
        });
        await IAP.finishTransaction({ purchase: purchaseItem, isConsumable: true });
        Alert.alert('Succès', successMessage);
        onSuccess?.();
      }
    } catch (error: any) {
      if (error?.code !== 'E_USER_CANCELLED') {
        if (Platform.OS === 'android' && isSkuNotFoundError(error)) {
          Alert.alert('Erreur Google Play', `SKU introuvable (${sku}). Vérifie l'activation du produit.`);
        } else {
          Alert.alert('Erreur Google Play', String(error?.message || 'Achat non finalisé'));
        }
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const patchLikerState = (targetUserId: string, patch: Partial<StatusLiker>) => {
    setLikers((prev) => prev.map((entry) => (
      String(entry.user_id) === String(targetUserId)
        ? { ...entry, ...patch }
        : entry
    )));
    setSelectedLiker((prev) => {
      if (!prev || String(prev.user_id) !== String(targetUserId)) return prev;
      return { ...prev, ...patch };
    });
  };

  const likeBackLiker = async (entry: StatusLiker) => {
    const targetUserId = String(entry?.profile?.id || '').trim();
    if (!targetUserId || !currentUser) return;
    if (String(targetUserId) === String(currentUser.id)) return;
    if (likingBackUserId || entry.liked_back || entry.is_matched) return;

    try {
      setLikingBackUserId(targetUserId);
      const payload = await apiRequest<{ matched?: boolean }>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          targetUserId,
          direction: 'RIGHT',
        }),
      });
      patchLikerState(targetUserId, {
        liked_back: true,
        is_matched: !!payload?.matched || entry.is_matched,
      });

      if (payload?.matched) {
        Alert.alert('Match 🎉', `Vous et ${entry.profile.name} vous plaisez mutuellement.`);
      } else {
        Alert.alert('Like envoyé', `Votre like a été envoyé à ${entry.profile.name}.`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', String(error?.message || 'Impossible de liker ce profil pour le moment.'));
    } finally {
      setLikingBackUserId(null);
    }
  };

  const targetLikerId = String(selectedLiker?.profile?.id || '').trim();

  const handleSuperLikePaystack = async () => {
    if (!targetLikerId) return;
    await initiatePurchasePaystack(
      'SUPER_LIKE',
      parseInt(process.env.EXPO_PUBLIC_SUPER_LIKE_AMOUNT || '500', 10),
      targetLikerId,
      'Super Like envoyé !',
      () => setShowSuperLikePurchaseModal(false)
    );
  };

  const handleSuperLikeGoogle = async () => {
    if (!targetLikerId) return;
    await requestGooglePurchase(
      SUPER_LIKE_SKU,
      'SUPER_LIKE',
      targetLikerId,
      'Super Like envoyé !',
      () => setShowSuperLikePurchaseModal(false)
    );
  };

  const handleDirectMessagePaystack = async () => {
    if (!targetLikerId) return;
    await initiatePurchasePaystack(
      'DIRECT_MESSAGE',
      parseInt(process.env.EXPO_PUBLIC_DIRECT_MESSAGE_AMOUNT || '200', 10),
      targetLikerId,
      'Message direct débloqué !',
      () => {
        setShowDirectMessagePurchaseModal(false);
        // @ts-ignore
        navigation.navigate('Chat', { userId: targetLikerId });
      }
    );
  };

  const handleDirectMessageGoogle = async () => {
    if (!targetLikerId) return;
    await requestGooglePurchase(
      DIRECT_MESSAGE_SKU,
      'DIRECT_MESSAGE',
      targetLikerId,
      'Message direct débloqué !',
      () => {
        setShowDirectMessagePurchaseModal(false);
        // @ts-ignore
        navigation.navigate('Chat', { userId: targetLikerId });
      }
    );
  };

  const renderLikerState = (entry: StatusLiker) => {
    if (entry.is_matched) {
      return <Text style={styles.likerStateMatched}>Match</Text>;
    }
    if (entry.liked_back) {
      return <Text style={styles.likerStateSent}>Like envoyé</Text>;
    }
    return <Text style={styles.likerStatePending}>Nouveau</Text>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeft color={COLORS.ink} /></Pressable>
        <Text style={styles.headerTitle}>Yamo Stories</Text>
        <Pressable onPress={pickStatusMedia} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Plus color={COLORS.primary} />}
        </Pressable>
      </View>

      <FlatList
        data={locked ? [] : statuses}
        renderItem={renderStatusItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            {locked ? (
              <>
                <Text style={styles.emptyTitle}>Essai expiré</Text>
                <Text style={styles.emptyText}>Passez à Premium pour accéder aux stories.</Text>
                <Pressable style={styles.premiumBtn} onPress={() => {
                  // @ts-ignore
                  navigation.navigate('Premium');
                }}>
                  <Text style={styles.premiumBtnText}>Passer à Premium</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.emptyText}>Aucun statut pour le moment.</Text>
            )}
          </View>
        }
      />

      <Modal visible={!!selectedStatus} transparent animationType="fade">
        <View style={styles.modal}>
          <Pressable style={styles.closeModal} onPress={() => setSelectedStatusId(null)}><X color="#fff" size={32} /></Pressable>
          {selectedStatus && (
            <>
              {selectedStatus.message_type === 'VIDEO' ? (
                <VideoPlayer uri={resolvedUrls[selectedStatus.media_url]} style={styles.fullMedia} />
              ) : (
                <Image source={{ uri: resolvedUrls[selectedStatus.media_url] }} style={styles.fullMedia} resizeMode="contain" />
              )}
              <View style={styles.modalMeta}>
                <Text style={styles.modalMetaName}>{selectedStatus.profiles.name}</Text>
                <Text style={styles.modalMetaDate}>{formatPublishedAt(selectedStatus.created_at)}</Text>
                <View style={styles.modalActionsRow}>
                  <Pressable
                    style={[styles.modalLikeAction, selectedStatus.liked_by_me ? styles.modalLikeActionActive : null]}
                    disabled={!!likeLoadingByStatusId[selectedStatus.id] || String(selectedStatus.user_id) === String(currentUser?.id)}
                    onPress={() => { void handleToggleLike(selectedStatus); }}
                  >
                    <Heart
                      size={16}
                      color={selectedStatus.liked_by_me ? '#22c55e' : '#ef4444'}
                      fill={selectedStatus.liked_by_me ? '#22c55e' : 'transparent'}
                    />
                    <Text style={styles.modalLikeActionText}>{Number(selectedStatus.likes_count || 0)}</Text>
                  </Pressable>
                  {String(selectedStatus.user_id) === String(currentUser?.id) ? (
                    <Pressable style={styles.modalLikersButton} onPress={() => { void openLikersModal(selectedStatus); }}>
                      <Text style={styles.modalLikersButtonText}>Voir les likes</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>

      <Modal visible={likersModalVisible} transparent animationType="slide" onRequestClose={() => setLikersModalVisible(false)}>
        <View style={styles.likersModalOverlay}>
          <View style={styles.likersModalSheet}>
            <View style={styles.likersHeader}>
              <Text style={styles.likersTitle}>Personnes ayant aimé</Text>
              <Pressable onPress={() => setLikersModalVisible(false)}>
                <X size={20} color={COLORS.ink} />
              </Pressable>
            </View>
            {likersLoading ? (
              <View style={styles.likersLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.likersLoadingText}>Chargement...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.likersList}>
                {likers.length === 0 ? (
                  <Text style={styles.likersEmpty}>Aucun like pour le moment.</Text>
                ) : (
                  likers.map((entry) => (
                    <View key={`${entry.user_id}-${entry.created_at}`} style={styles.likerRow}>
                      <Image source={{ uri: entry.profile.photos?.[0] || 'https://placehold.co/80x80' }} style={styles.likerAvatar} />
                      <View style={styles.likerTextBlock}>
                        <Text style={styles.likerName}>{entry.profile.name}</Text>
                        <Text style={styles.likerDate}>{formatPublishedAt(entry.created_at)}</Text>
                      </View>
                      <View style={styles.likerActions}>
                        {renderLikerState(entry)}
                        <Pressable
                          style={styles.likerOpenBtn}
                          onPress={() => {
                            setLikersModalVisible(false);
                            (navigation as any).navigate('ProfileDetail', { profile: entry.profile });
                          }}
                        >
                          <Text style={styles.likerOpenBtnText}>Ouvrir fiche</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.likerHeartBtn,
                            (entry.liked_back || entry.is_matched) && styles.likerHeartBtnDone,
                            likingBackUserId === entry.user_id && styles.likerHeartBtnDisabled,
                          ]}
                          onPress={() => { void likeBackLiker(entry); }}
                          disabled={!!entry.liked_back || !!entry.is_matched || likingBackUserId === entry.user_id}
                        >
                          <Heart size={15} color="#fff" fill="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={likerProfileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLikerProfileModalVisible(false)}
      >
        <View style={styles.likerProfileOverlay}>
          <View style={styles.likerProfileCard}>
            <Pressable
              style={styles.likerProfileClose}
              onPress={() => setLikerProfileModalVisible(false)}
            >
              <X size={18} color={COLORS.ink} />
            </Pressable>
            {selectedLiker ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.likerPhotosRow}>
                  {(selectedLiker.profile.photos?.length ? selectedLiker.profile.photos : ['https://placehold.co/800x1000']).map((uri, idx) => (
                    <Image key={`${selectedLiker.user_id}-${idx}`} source={{ uri }} style={styles.likerPhotoLarge} />
                  ))}
                </ScrollView>
                <Text style={styles.likerProfileName}>
                  {selectedLiker.profile.name}
                  {typeof selectedLiker.profile.age === 'number' ? `, ${selectedLiker.profile.age}` : ''}
                </Text>
                <Text style={styles.likerProfileMeta}>
                  {[selectedLiker.profile.city, selectedLiker.profile.country].filter(Boolean).join(', ') || 'Localisation non renseignée'}
                </Text>
                {selectedLiker.profile.relationship_goal ? (
                  <Text style={styles.likerProfileGoal}>{selectedLiker.profile.relationship_goal}</Text>
                ) : null}
                {selectedLiker.profile.bio ? (
                  <Text style={styles.likerProfileBio}>{selectedLiker.profile.bio}</Text>
                ) : null}
                <View style={styles.likerInterestsWrap}>
                  {(selectedLiker.profile.interests || []).slice(0, 10).map((interest) => (
                    <Text key={`${selectedLiker.user_id}-${interest}`} style={styles.likerInterestTag}>{interest}</Text>
                  ))}
                </View>
                <View style={styles.likerProfileActions}>
                  <Pressable
                    style={[
                      styles.likerHeartBtnLarge,
                      (selectedLiker.liked_back || selectedLiker.is_matched) && styles.likerHeartBtnDone,
                      likingBackUserId === selectedLiker.user_id && styles.likerHeartBtnDisabled,
                    ]}
                    onPress={() => { void likeBackLiker(selectedLiker); }}
                    disabled={!!selectedLiker.liked_back || !!selectedLiker.is_matched || likingBackUserId === selectedLiker.user_id}
                  >
                    <Heart size={16} color="#fff" fill="#fff" />
                    <Text style={styles.likerHeartBtnLargeText}>
                      {selectedLiker.is_matched ? 'Match' : selectedLiker.liked_back ? 'Like envoyé' : 'Liker en retour'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.paidActionBtn}
                    onPress={() => setShowSuperLikePurchaseModal(true)}
                  >
                    <Text style={styles.paidActionBtnText}>Super Like payant</Text>
                  </Pressable>
                  <Pressable
                    style={styles.paidActionBtn}
                    onPress={() => setShowDirectMessagePurchaseModal(true)}
                  >
                    <Text style={styles.paidActionBtnText}>Message direct payant</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <SuperLikePurchaseModal
        visible={showSuperLikePurchaseModal}
        onClose={() => setShowSuperLikePurchaseModal(false)}
        onPurchasePaystack={handleSuperLikePaystack}
        onPurchaseGoogle={handleSuperLikeGoogle}
        loading={purchaseLoading}
        userName={selectedLiker?.profile?.name}
      />

      <DirectMessagePurchaseModal
        visible={showDirectMessagePurchaseModal}
        onClose={() => setShowDirectMessagePurchaseModal(false)}
        onPurchasePaystack={handleDirectMessagePaystack}
        onPurchaseGoogle={handleDirectMessageGoogle}
        loading={purchaseLoading}
        userName={selectedLiker?.profile?.name}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.ink },
  list: { padding: 10 },
  statusCard: { flex: 1, margin: 5, aspectRatio: 9/16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  statusPreview: { width: '100%', height: '100%' },
  videoPreviewFallback: { backgroundColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  statusAuthorChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.45)',
    padding: 1,
  },
  statusAuthorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  statusLikeButton: {
    position: 'absolute',
    top: 10,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  statusLikeButtonActive: {
    backgroundColor: 'rgba(220,252,231,0.95)',
  },
  statusLikeCount: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  statusInfo: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  statusMetaText: { flex: 1, paddingRight: 8 },
  statusName: { color: '#fff', fontSize: 12, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  statusDateTime: { color: '#f8fafc', fontSize: 10, fontWeight: '700', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 4 },
  modal: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullMedia: { width: '100%', height: '80%' },
  modalMeta: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  modalMetaName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalMetaDate: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginTop: 2 },
  modalActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalLikeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalLikeActionActive: {
    backgroundColor: 'rgba(220,252,231,0.95)',
  },
  modalLikeActionText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  modalLikersButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalLikersButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  likersModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  likersModalSheet: {
    minHeight: '45%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  likersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likersTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  likersLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  likersLoadingText: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  likersList: {
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },
  likersEmpty: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '700',
  },
  likerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  likerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  likerTextBlock: {
    flex: 1,
  },
  likerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likerStatePending: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '800',
  },
  likerStateSent: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
  },
  likerStateMatched: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800',
  },
  likerOpenBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  likerOpenBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
  },
  likerHeartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likerHeartBtnLarge: {
    minWidth: 160,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  likerHeartBtnLargeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  likerHeartBtnDone: {
    backgroundColor: '#16a34a',
  },
  likerHeartBtnDisabled: {
    opacity: 0.65,
  },
  likerProfileOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
  },
  likerProfileCard: {
    maxHeight: '86%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
  },
  likerProfileClose: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  likerPhotosRow: {
    gap: 10,
    paddingBottom: 10,
  },
  likerPhotoLarge: {
    width: 220,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  likerProfileName: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  likerProfileMeta: {
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '700',
  },
  likerProfileGoal: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800',
  },
  likerProfileBio: {
    marginTop: 10,
    color: '#0f172a',
    lineHeight: 20,
  },
  likerInterestsWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  likerInterestTag: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  likerProfileActions: {
    marginTop: 14,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 8,
  },
  paidActionBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  paidActionBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  likerName: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  likerDate: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 1,
  },
  empty: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 24 },
  emptyTitle: { color: '#7f1d1d', fontWeight: '900', fontSize: 20, marginBottom: 8 },
  emptyText: { color: COLORS.muted, textAlign: 'center' },
  premiumBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  premiumBtnText: { color: '#fff', fontWeight: '800' },
});

export default StatusScreen;
