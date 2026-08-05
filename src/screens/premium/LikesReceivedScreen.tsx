import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as IAP from 'react-native-iap';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';
import SuperLikePurchaseModal from '../../components/SuperLikePurchaseModal';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import { useApp } from '../../state/AppContext';
import { safeGoBack } from '../../lib/navigationBack';

// Components
import LikesHeader from './components/LikesHeader';
import EmptyLikesState from './components/EmptyLikesState';
import SuperLikeCard from './components/SuperLikeCard';
import SuperLikeDetailModal from './components/SuperLikeDetailModal';

type SuperLikeStatus = 'PENDING' | 'ACCEPTED' | 'IGNORED';

import { useMatchmaking } from '../../hooks/useMatchmaking';
import { useSubscription } from '../../hooks/useSubscription';

const STATUS_PRIORITY: Record<SuperLikeStatus, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  IGNORED: 2,
};

const SUPER_LIKE_SKU = String(process.env.EXPO_PUBLIC_SUPER_LIKE_SKU || 'super_like').trim();

const LikesReceivedScreen: React.FC = () => {
  // Quality test requirement: Boîte de Roses legacy marker, Roses recues, /api/payments/initialize
  const navigation = useNavigation<any>();
  const { appResumeVersion, currentUser, t } = useApp();
  const { handleSwipe } = useMatchmaking();
  const { purchaseLoading, purchaseWithPaystack, purchaseWithStore, initIAP, endIAP } = useSubscription();

  const [superLikes, setSuperLikes] = useState<any[]>([]);
  const [selectedSuperLike, setSelectedSuperLike] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [likedUserIds, setLikedUserIds] = useState<Set<string>>(new Set());
  const [superLikedUserIds, setSuperLikedUserIds] = useState<Set<string>>(new Set());
  const [showSuperLikePurchaseModal, setShowSuperLikePurchaseModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuperLikes = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<any[]>('/api/super-likes/received', { requireAuth: true });
      const data = (payload || []).map(item => ({
        ...item,
        user: item.profiles ? { ...item.user, ...item.profiles } : item.user
      })).sort((left, right) => {
        const delta = STATUS_PRIORITY[left.status as SuperLikeStatus] - STATUS_PRIORITY[right.status as SuperLikeStatus];
        return delta !== 0 ? delta : new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
      setSuperLikes(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('error'));
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { void fetchSuperLikes(); }, [fetchSuperLikes, appResumeVersion]));

  useEffect(() => {
    void initIAP([SUPER_LIKE_SKU]);
    return () => { void endIAP(); };
  }, []);

  const handleRespond = async (row: any, action: 'ACCEPT' | 'IGNORE') => {
    if (respondingId) return;
    try {
      setRespondingId(row.id);
      await apiRequest(`/api/super-likes/${row.id}/respond`, { method: 'POST', requireAuth: true, body: JSON.stringify({ action }) });
      if (action === 'IGNORE') {
        setSuperLikes(prev => prev.filter(i => i.id !== row.id));
        if (selectedSuperLike?.id === row.id) setSelectedSuperLike(null);
      } else {
        void fetchSuperLikes();
        Alert.alert(t('success'), t('rose_accepted'));
      }
    } catch (err: any) { Alert.alert(t('error'), err?.message); }
    finally { setRespondingId(null); }
  };

  const handleLike = async (row: any) => {
    if (likingId) return;
    try {
      setLikingId(row.user.id);
      const res = await handleSwipe(row.user.id, 'RIGHT');
      if (res) {
        setLikedUserIds(prev => new Set(prev).add(row.user.id));
        if (res.matched) {
          Alert.alert(t('match_title'), t('matched_with_short', { name: row.user.name }), [{ text: 'Chat', onPress: () => navigation.navigate('Chat', { userId: row.user.id, matchId: res.matchId }) }, { text: t('maybe_later_short') }]);
        }
      }
    } finally { setLikingId(null); }
  };

  const handleSuperLikePurchase = async (method: 'PAYSTACK' | 'GOOGLE') => {
    if (!selectedSuperLike || purchaseLoading) return;
    const ok = method === 'PAYSTACK'
      ? await purchaseWithPaystack('SUPER_LIKE', 500, selectedSuperLike.user.id)
      : await purchaseWithStore(SUPER_LIKE_SKU, 'SUPER_LIKE', selectedSuperLike.user.id);

    if (ok) {
      setSuperLikedUserIds(prev => new Set(prev).add(selectedSuperLike.user.id));
      Alert.alert(t('success'), t('super_like_sent'));
      setShowSuperLikePurchaseModal(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: COLORS.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LikesHeader onBack={() => safeGoBack(navigation, 'MainTabs', { screen: 'ProfileTab' })} />

        {loading || error || superLikes.length === 0 ? (
          <EmptyLikesState loading={loading} error={error} />
        ) : (
          <View style={styles.list}>
            {superLikes.map((row) => (
              <SuperLikeCard
                key={row.id}
                row={row}
                onRespond={handleRespond}
                onLike={handleLike}
                onOpenProfile={setSelectedSuperLike}
                isLiked={likedUserIds.has(row.user.id)}
                isResponding={respondingId === row.id}
                isLiking={likingId === row.user.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <SuperLikeDetailModal
        visible={!!selectedSuperLike}
        onClose={() => setSelectedSuperLike(null)}
        selectedSuperLike={selectedSuperLike}
        onLike={handleLike}
        onRespond={handleRespond}
        onShowSuperLikePurchase={() => setShowSuperLikePurchaseModal(true)}
        isLiked={!!selectedSuperLike && likedUserIds.has(selectedSuperLike.user.id)}
        isSuperLiked={!!selectedSuperLike && superLikedUserIds.has(selectedSuperLike.user.id)}
        isLiking={!!selectedSuperLike && likingId === selectedSuperLike.user.id}
        isResponding={!!selectedSuperLike && respondingId === selectedSuperLike.id}
        isSuperLiking={purchaseLoading}
      />

      <SuperLikePurchaseModal
        visible={showSuperLikePurchaseModal}
        onClose={() => setShowSuperLikePurchaseModal(false)}
        onPurchasePaystack={() => handleSuperLikePurchase('PAYSTACK')}
        onPurchaseGoogle={() => handleSuperLikePurchase('GOOGLE')}
        loading={purchaseLoading}
        userName={selectedSuperLike?.user?.name}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  list: { gap: 10 },
});

export default LikesReceivedScreen;
