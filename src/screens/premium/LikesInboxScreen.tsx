import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Heart, X } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';

type LikeInboxRow = {
  liker_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
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

const TRIAL_DAYS = 7;

const LikesInboxScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser } = useApp();
  const [likes, setLikes] = useState<LikeInboxRow[]>([]);
  const [selectedLike, setSelectedLike] = useState<LikeInboxRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trialInfo = useMemo(() => {
    const isMale = currentUser?.gender === 'MALE';
    if (!isMale || currentUser?.isPremium || !currentUser?.trial_started_at) {
      return { active: false };
    }

    const startedAt = new Date(currentUser.trial_started_at).getTime();
    if (!Number.isFinite(startedAt)) {
      return { active: false };
    }

    const trialEndTs = startedAt + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    return { active: trialEndTs > Date.now() };
  }, [currentUser?.gender, currentUser?.isPremium, currentUser?.trial_started_at]);

  const canAccessLikesInbox = !!currentUser?.isPremium || trialInfo.active;

  const fetchLikesInbox = useCallback(async () => {
    if (!canAccessLikesInbox) {
      setLikes([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      const payload = await apiRequest<LikeInboxRow[]>('/api/likes/received', {
        requireAuth: true,
      });
      setLikes(Array.isArray(payload) ? payload : []);
      setError(null);
    } catch (err: any) {
      setLikes([]);
      setError(err?.message || 'Impossible de charger les likes reçus.');
    } finally {
      setLoading(false);
    }
  }, [canAccessLikesInbox]);

  useFocusEffect(
    useCallback(() => {
      void fetchLikesInbox();
    }, [fetchLikesInbox])
  );

  const likeBack = async (row: LikeInboxRow) => {
    const targetUserId = row?.user?.id;
    if (!targetUserId || likingId || row.liked_back || row.is_matched) return;

    try {
      setLikingId(targetUserId);
      const payload = await apiRequest<{ matched?: boolean }>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          targetUserId,
          direction: 'RIGHT',
        }),
      });

      setLikes((prev) => prev.map((item) => (
        item.user.id === targetUserId
          ? {
            ...item,
            liked_back: true,
            is_matched: !!payload?.matched || item.is_matched,
          }
          : item
      )));

      if (selectedLike?.user?.id === targetUserId) {
        setSelectedLike((prev) => (prev ? {
          ...prev,
          liked_back: true,
          is_matched: !!payload?.matched || prev.is_matched,
        } : prev));
      }

      if (payload?.matched) {
        Alert.alert('Match 🎉', `Vous et ${row.user.name} vous plaisez mutuellement.`);
      } else {
        Alert.alert('Like envoyé', `Votre like a été envoyé à ${row.user.name}.`);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de liker ce profil pour le moment.');
    } finally {
      setLikingId(null);
    }
  };

  const renderLikeState = (row: LikeInboxRow) => {
    if (row.is_matched) {
      return (
        <View style={[styles.statePill, styles.statePillMatched]}>
          <Text style={[styles.statePillText, styles.statePillTextMatched]}>Match</Text>
        </View>
      );
    }
    if (row.liked_back) {
      return (
        <View style={[styles.statePill, styles.statePillSent]}>
          <Text style={[styles.statePillText, styles.statePillTextSent]}>Like envoyé</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statePill, styles.statePillPending]}>
        <Text style={[styles.statePillText, styles.statePillTextPending]}>Nouveau like</Text>
      </View>
    );
  };

  if (!canAccessLikesInbox) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockedWrap}>
          <Text style={styles.title}>Boîte Likes reçus</Text>
          <Text style={styles.lockedText}>Cette boîte est réservée aux abonnés Premium.</Text>
          <Pressable style={styles.lockedBtn} onPress={() => navigation.navigate('Premium' as never)}>
            <Text style={styles.lockedBtnText}>Passer à Premium</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Boîte Likes reçus</Text>
            <Text style={styles.subtitle}>Like en retour pour obtenir un match.</Text>
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
        ) : likes.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.hint}>Aucun like reçu pour le moment.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {likes.map((row) => (
              <View key={`${row.liker_id}-${row.created_at}`} style={styles.card}>
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
                    {renderLikeState(row)}
                  </View>
                  <Text style={styles.meta}>{row.user.city || 'Ville non renseignée'}</Text>
                  <Text style={styles.meta}>Reçu le {new Date(row.created_at).toLocaleString('fr-FR')}</Text>
                  <View style={styles.actionsRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => setSelectedLike(row)}>
                      <Text style={styles.secondaryButtonText}>Ouvrir fiche</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.likeButton,
                        (row.liked_back || row.is_matched) && styles.likeButtonDone,
                        likingId === row.user.id && styles.buttonDisabled,
                      ]}
                      onPress={() => { void likeBack(row); }}
                      disabled={!!row.liked_back || !!row.is_matched || likingId === row.user.id}
                    >
                      <Heart
                        size={16}
                        color="#fff"
                        fill="#fff"
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedLike}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLike(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalClose} onPress={() => setSelectedLike(null)}>
              <X size={18} color="#64748b" />
            </Pressable>
            {selectedLike ? (
              <>
                <Image
                  source={{
                    uri:
                      selectedLike.user.photos?.[0]
                      || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&auto=format&fit=crop',
                  }}
                  style={styles.modalPhoto}
                />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalName}>
                    {selectedLike.user.name}, {selectedLike.user.age}
                  </Text>
                  {renderLikeState(selectedLike)}
                </View>
                <Text style={styles.modalMeta}>
                  {selectedLike.user.city || 'Ville non renseignée'}
                  {selectedLike.user.country ? `, ${selectedLike.user.country}` : ''}
                </Text>
                {selectedLike.user.relationship_goal ? (
                  <Text style={styles.modalGoal}>{selectedLike.user.relationship_goal}</Text>
                ) : null}
                {selectedLike.user.bio ? (
                  <Text style={styles.modalBio}>{selectedLike.user.bio}</Text>
                ) : null}
                <View style={styles.tags}>
                  {(selectedLike.user.interests || []).slice(0, 6).map((interest) => (
                    <Text key={interest} style={styles.tag}>{interest}</Text>
                  ))}
                </View>
                <View style={styles.modalActions}>
                  <Pressable
                    style={[
                      styles.likeButton,
                      (selectedLike.liked_back || selectedLike.is_matched) && styles.likeButtonDone,
                      likingId === selectedLike.user.id && styles.buttonDisabled,
                    ]}
                    onPress={() => { void likeBack(selectedLike); }}
                    disabled={!!selectedLike.liked_back || !!selectedLike.is_matched || likingId === selectedLike.user.id}
                  >
                    <Heart size={18} color="#fff" fill="#fff" />
                  </Pressable>
                </View>
              </>
            ) : null}
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
  statePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statePillPending: {
    backgroundColor: '#fee2e2',
  },
  statePillSent: {
    backgroundColor: '#dcfce7',
  },
  statePillMatched: {
    backgroundColor: '#dbeafe',
  },
  statePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statePillTextPending: {
    color: '#b91c1c',
  },
  statePillTextSent: {
    color: '#15803d',
  },
  statePillTextMatched: {
    color: '#1d4ed8',
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
    paddingVertical: 5,
    fontSize: 12,
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
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  lockedWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  lockedText: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  lockedBtn: {
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lockedBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});

export default LikesInboxScreen;
