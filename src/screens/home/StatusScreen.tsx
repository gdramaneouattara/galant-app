import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeft, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { fbStorage } from '../../lib/firebase';
import { uploadImageVariantsToBucket } from '../../lib/storageUpload';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import type { RootStackParamList } from '../../navigation/MainNavigator';

// Components
import StatusCard from './components/StatusCard';
import StatusViewerModal from './components/StatusViewerModal';
import StatusLikersModal from './components/StatusLikersModal';
import LikerProfileModal from './components/LikerProfileModal';
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';
import DirectMessagePurchaseModal from '../../components/DirectMessagePurchaseModal';
import StoryPurchaseModal from '../../components/StoryPurchaseModal';

interface Status {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  thumbnail_url?: string | null;
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
    interests?: string[];
  };
}

import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useSubscription } from '../../hooks/useSubscription';

const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();
const DIRECT_MESSAGE_SKU = String(process.env.EXPO_PUBLIC_DIRECT_MESSAGE_SKU || 'direct_message_1').trim();
const STORY_VIDEO_MAX_DURATION_MS = 16 * 1000;
const VIDEO_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;

const StatusScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Status'>>();
  const { currentUser, appResumeVersion } = useApp();
  const { handleSwipe } = useMatchmaking();
  const { purchaseLoading, purchaseWithPaystack, purchaseWithStore, initIAP, endIAP } = useSubscription();

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
  const [selectedLiker, setSelectedLiker] = useState<StatusLiker | null>(null);
  const [likingBackUserId, setLikingBackUserId] = useState<string | null>(null);
  const [showSuperLikePurchaseModal, setShowSuperLikePurchaseModal] = useState(false);
  const [showDirectMessagePurchaseModal, setShowDirectMessagePurchaseModal] = useState(false);
  const [showStoryPurchaseModal, setShowStoryPurchaseModal] = useState(false);
  const [storyUploadUnlocked, setStoryUploadUnlocked] = useState(false);
  const initialActionHandledRef = useRef(false);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiRequest<Status[]>('/api/statuses', { requireAuth: true });
      setStatuses(data || []);
      setLocked(false);

      for (const s of (data || [])) {
        for (const mediaPath of [s.media_url, s.thumbnail_url].filter(Boolean)) {
          const path = String(mediaPath);
          if (resolvedUrls[path]) continue;
          try {
            const url = await fbStorage.ref(`statuses/${path}`).getDownloadURL();
            setResolvedUrls(prev => ({ ...prev, [path]: url }));
          } catch (e) {}
        }
      }
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('subscription_required')) {
        setLocked(true);
        setStatuses([]);
      }
    } finally { setLoading(false); }
  }, [resolvedUrls]);

  useEffect(() => {
    let cancelled = false;
    const buildVideoPreviews = async () => {
      for (const item of statuses) {
        if (item.message_type !== 'VIDEO' || videoPreviewUrls[item.media_url]) continue;
        if (item.thumbnail_url && resolvedUrls[item.thumbnail_url]) continue;
        const sourceUrl = resolvedUrls[item.media_url];
        if (!sourceUrl) continue;
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(sourceUrl, { time: 1000 });
          if (!cancelled && uri) setVideoPreviewUrls(prev => ({ ...prev, [item.media_url]: uri }));
        } catch {}
      }
    };
    buildVideoPreviews();
    return () => { cancelled = true; };
  }, [statuses, resolvedUrls]);

  useEffect(() => {
    void initIAP([SUPER_LIKE_SKU, DIRECT_MESSAGE_SKU]);
    return () => { void endIAP(); };
  }, []);

  useEffect(() => { void fetchStatuses(); }, []);
  useEffect(() => { if (appResumeVersion > 0) void fetchStatuses(); }, [appResumeVersion]);

  const refreshStoryUploadAccess = async () => {
    if (!currentUser) return false;
    if (currentUser.is_premium || currentUser.is_vip) return true;
    try {
      const access = await apiRequest<{ canPublish?: boolean; hasPurchasedUpload?: boolean }>('/api/statuses/upload-access', { requireAuth: true });
      setStoryUploadUnlocked(!!access.hasPurchasedUpload);
      return !!access.canPublish;
    } catch {
      return false;
    }
  };

  const pickStatusMedia = async () => {
    if (uploading) return;
    const canPublish = !locked && (currentUser?.is_premium || currentUser?.is_vip || storyUploadUnlocked || await refreshStoryUploadAccess());
    if (!canPublish) {
      setShowStoryPurchaseModal(true);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Permission requise', "Autorisez l'accès à la galerie.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 15, // LIMITE À 15 SECONDES CÔTÉ CLIENT
      videoExportPreset: ImagePicker.VideoExportPreset.H264_960x540,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0].uri) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'VIDEO' : 'IMAGE';
      if (type === 'VIDEO') {
        if (typeof asset.duration === 'number' && asset.duration > STORY_VIDEO_MAX_DURATION_MS) {
          Alert.alert('Video trop longue', "Les stories sont limitees a 15 secondes.");
          return;
        }
        if (typeof asset.fileSize === 'number' && asset.fileSize > VIDEO_UPLOAD_MAX_BYTES) {
          Alert.alert('Video trop lourde', "La video doit peser moins de 30 Mo avant envoi.");
          return;
        }
      }
      setUploading(true);
      try {
        let path = '';
        let thumbnailPath: string | null = null;

        if (type === 'VIDEO') {
          // Utilisation du serveur pour compresser la vidéo
          const formData = new FormData();
          formData.append('video', {
            uri: asset.uri,
            name: 'status.mp4',
            type: asset.mimeType || 'video/mp4',
          } as any);

          const res = await apiRequest<{ mediaUrl: string; thumbnailUrl?: string }>('/api/media/upload-video', {
            method: 'POST',
            requireAuth: true,
            body: formData,
          });
          path = res.mediaUrl;
          thumbnailPath = res.thumbnailUrl || null;
        } else {
          path = `${currentUser?.id}/${Date.now()}.webp`;
          const uploaded = await uploadImageVariantsToBucket({
            bucket: 'statuses',
            path,
            uri: asset.uri,
          });
          thumbnailPath = uploaded.paths.thumb.replace(/^statuses\//, '');
        }

        await apiRequest('/api/statuses', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify({ mediaUrl: path, thumbnailUrl: thumbnailPath, type, content: '' })
        });
        setStoryUploadUnlocked(false);
        void fetchStatuses();
      } catch (e) {
        Alert.alert('Erreur', "Impossible de publier le statut.");
      } finally {
        setUploading(false);
      }
    }
  };

  useEffect(() => {
    if (initialActionHandledRef.current || loading) return;
    const initialStatusId = route.params?.initialStatusId;
    const openComposer = route.params?.openComposer;
    if (initialStatusId && statuses.some((status) => status.id === initialStatusId)) {
      initialActionHandledRef.current = true;
      setSelectedStatusId(initialStatusId);
      return;
    }
    if (openComposer) {
      initialActionHandledRef.current = true;
      setTimeout(() => { void pickStatusMedia(); }, 350);
    }
  }, [loading, route.params?.initialStatusId, route.params?.openComposer, statuses]);

  const handleToggleLike = async (status: Status) => {
    const statusId = status.id;
    if (!statusId || !currentUser || String(status.user_id) === String(currentUser.id) || likeLoadingByStatusId[statusId]) return;

    const currentlyLiked = !!status.liked_by_me;
    setStatuses(prev => prev.map(s => s.id === statusId ? { ...s, liked_by_me: !currentlyLiked, likes_count: (s.likes_count || 0) + (currentlyLiked ? -1 : 1) } : s));
    setLikeLoadingByStatusId(prev => ({ ...prev, [statusId]: true }));
    try {
      await apiRequest(`/api/statuses/${statusId}/like`, { method: currentlyLiked ? 'DELETE' : 'POST', requireAuth: true });
    } catch {
      setStatuses(prev => prev.map(s => s.id === statusId ? { ...s, liked_by_me: currentlyLiked, likes_count: (s.likes_count || 0) + (currentlyLiked ? 1 : -1) } : s));
    } finally { setLikeLoadingByStatusId(prev => { const n = { ...prev }; delete n[statusId]; return n; }); }
  };

  const openLikersModal = async (status: Status) => {
    setLikersModalVisible(true);
    setLikersLoading(true);
    try {
      const payload = await apiRequest<{ likes: StatusLiker[] }>(`/api/statuses/${status.id}/likes`, { requireAuth: true });
      setLikers(payload?.likes || []);
    } catch { setLikers([]); }
    finally { setLikersLoading(false); }
  };

  const likeBackLiker = async (entry: StatusLiker) => {
    const targetUserId = entry.profile.id;
    if (!targetUserId || !currentUser || String(targetUserId) === String(currentUser.id) || likingBackUserId) return;
    try {
      setLikingBackUserId(targetUserId);
      const res = await handleSwipe(targetUserId, 'RIGHT');
      if (res) {
        setLikers(prev => prev.map(l => l.user_id === targetUserId ? { ...l, liked_back: true, is_matched: !!res.matched } : l));
        if (res.matched) Alert.alert('Match 🎉', `Vous et ${entry.profile.name} vous plaisez mutuellement.`);
      }
    } finally { setLikingBackUserId(null); }
  };

  const handlePurchaseAction = async (method: 'PAYSTACK' | 'GOOGLE', type: 'SUPER_LIKE' | 'DIRECT_MESSAGE') => {
    if (!selectedLiker || purchaseLoading) return;
    const sku = type === 'SUPER_LIKE' ? SUPER_LIKE_SKU : DIRECT_MESSAGE_SKU;
    const amount = 500;

    const ok = method === 'PAYSTACK'
      ? await purchaseWithPaystack(type, amount, selectedLiker.user_id)
      : await purchaseWithStore(sku, type, selectedLiker.user_id);

    if (!ok) return;

    if (type === 'SUPER_LIKE') {
      const res = await handleSwipe(selectedLiker.user_id, 'RIGHT', true);
      setLikers(prev => prev.map(l => l.user_id === selectedLiker.user_id ? { ...l, liked_back: true, is_matched: !!res?.matched } : l));
      Alert.alert('Succes', res?.matched ? 'Super Like envoye et match cree.' : 'Super Like envoye !');
      setShowSuperLikePurchaseModal(false);
      return;
    }

    const thread = await apiRequest<{ matchId: string }>('/api/messages/direct-thread', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ targetUserId: selectedLiker.user_id }),
    });
    Alert.alert('Succes', 'Message direct debloque !');
    setShowDirectMessagePurchaseModal(false);
    (navigation as any).navigate('Chat', { userId: selectedLiker.user_id, matchId: thread.matchId });
  };

  const handleStoryPurchasePaystack = async () => {
    const ok = await purchaseWithPaystack('STORY_UPLOAD', 500);
    if (ok) {
      setShowStoryPurchaseModal(false);
      // Wait a bit for server sync and then allow picker
      setStoryUploadUnlocked(true);
      setTimeout(() => {
        pickStatusMedia();
      }, 1000);
    }
  };

  const handleStoryPurchaseGoogle = async () => {
    // Assuming you'll add 'story_upload' SKU to Google Play/App Store
    const ok = await purchaseWithStore('story_upload', 'STORY_UPLOAD');
    if (ok) {
      setShowStoryPurchaseModal(false);
      setStoryUploadUnlocked(true);
      setTimeout(() => {
        pickStatusMedia();
      }, 1000);
    }
  };

  const deleteStatus = async (status: Status) => {
    if (!status || String(status.user_id) !== String(currentUser?.id)) return;
    Alert.alert('Supprimer la story', 'Voulez-vous retirer cette story ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await apiRequest(`/api/statuses/${status.id}`, { method: 'DELETE', requireAuth: true });
          setSelectedStatusId(null);
          setStatuses(prev => prev.filter(item => item.id !== status.id));
        } catch (e: any) {
          Alert.alert('Erreur', e.message || 'Impossible de supprimer la story.');
        }
      }},
    ]);
  };

  const formatPublishedAt = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date.getTime()) ? '' : `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const selectedStatus = statuses.find(s => s.id === selectedStatusId) || null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><ChevronLeft color={COLORS.ink} /></Pressable>
        <Text style={styles.headerTitle}>Galant Stories</Text>
        <Pressable onPress={pickStatusMedia} disabled={uploading}>
          {uploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Plus color={COLORS.primary} />}
        </Pressable>
      </View>

      <FlatList
        data={locked ? [] : statuses}
        renderItem={({ item }) => (
          <StatusCard
            item={item}
            onPress={setSelectedStatusId}
            onToggleLike={handleToggleLike}
            likeLoading={!!likeLoadingByStatusId[item.id]}
            isCurrentUser={String(item.user_id) === String(currentUser?.id)}
            resolvedUrl={(item.thumbnail_url && resolvedUrls[item.thumbnail_url]) || resolvedUrls[item.media_url]}
            videoPreviewUrl={(item.thumbnail_url && resolvedUrls[item.thumbnail_url]) || videoPreviewUrls[item.media_url]}
            formattedDate={formatPublishedAt(item.created_at)}
          />
        )}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            {locked ? (
              <>
                <Text style={styles.emptyTitle}>Essai expiré</Text>
                <Text style={styles.emptyText}>Passez à Premium pour accéder aux stories.</Text>
                <Pressable style={styles.premiumBtn} onPress={() => (navigation as any).navigate('Premium')}><Text style={styles.premiumBtnText}>Passer à Premium</Text></Pressable>
              </>
            ) : <Text style={styles.emptyText}>Aucun statut pour le moment.</Text>}
          </View>
        }
      />

      <StatusViewerModal
        visible={!!selectedStatus}
        status={selectedStatus}
        onClose={() => setSelectedStatusId(null)}
        onToggleLike={handleToggleLike}
        onOpenLikers={openLikersModal}
        onDelete={deleteStatus}
        likeLoading={!!(selectedStatus && likeLoadingByStatusId[selectedStatus.id])}
        isCurrentUser={String(selectedStatus?.user_id) === String(currentUser?.id)}
        resolvedUrl={selectedStatus ? resolvedUrls[selectedStatus.media_url] : ''}
        formattedDate={selectedStatus ? formatPublishedAt(selectedStatus.created_at) : ''}
      />

      <StatusLikersModal
        visible={likersModalVisible}
        onClose={() => setLikersModalVisible(false)}
        loading={likersLoading}
        likers={likers}
        onOpenProfile={(l) => setSelectedLiker(l)}
        onLikeBack={likeBackLiker}
        likingBackUserId={likingBackUserId}
        formatDate={formatPublishedAt}
      />

      <LikerProfileModal
        visible={!!selectedLiker}
        onClose={() => setSelectedLiker(null)}
        liker={selectedLiker}
        onLikeBack={likeBackLiker}
        onSuperLike={() => setShowSuperLikePurchaseModal(true)}
        onDirectMessage={() => setShowDirectMessagePurchaseModal(true)}
        likingBackUserId={likingBackUserId}
      />

      <SuperLikePurchaseModal
        visible={showSuperLikePurchaseModal}
        onClose={() => setShowSuperLikePurchaseModal(false)}
        onPurchasePaystack={() => handlePurchaseAction('PAYSTACK', 'SUPER_LIKE')}
        onPurchaseGoogle={() => handlePurchaseAction('GOOGLE', 'SUPER_LIKE')}
        loading={purchaseLoading}
        userName={selectedLiker?.profile.name}
      />

      <DirectMessagePurchaseModal
        visible={showDirectMessagePurchaseModal}
        onClose={() => setShowDirectMessagePurchaseModal(false)}
        onPurchasePaystack={() => handlePurchaseAction('PAYSTACK', 'DIRECT_MESSAGE')}
        onPurchaseGoogle={() => handlePurchaseAction('GOOGLE', 'DIRECT_MESSAGE')}
        loading={purchaseLoading}
        userName={selectedLiker?.profile.name}
      />

      <StoryPurchaseModal
        visible={showStoryPurchaseModal}
        onClose={() => setShowStoryPurchaseModal(false)}
        onPurchasePaystack={handleStoryPurchasePaystack}
        onPurchaseGoogle={handleStoryPurchaseGoogle}
        loading={purchaseLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.ink },
  list: { padding: 10 },
  empty: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 24 },
  emptyTitle: { color: '#7f1d1d', fontWeight: '900', fontSize: 20, marginBottom: 8 },
  emptyText: { color: COLORS.muted, textAlign: 'center' },
  premiumBtn: { marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  premiumBtnText: { color: '#fff', fontWeight: '800' },
});

export default StatusScreen;
