import React, { useCallback, useState } from 'react';
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
import { Check, Heart, Star, X } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';

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

const STATUS_PRIORITY: Record<SuperLikeStatus, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  IGNORED: 2,
};

const LikesReceivedScreen: React.FC = () => {
  const navigation = useNavigation();
  const [superLikes, setSuperLikes] = useState<SuperLikeRow[]>([]);
  const [selectedSuperLike, setSelectedSuperLike] = useState<SuperLikeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [likedUserIds, setLikedUserIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

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
      const payload = await apiRequest<{ matched?: boolean }>('/api/matchmaking/swipe', {
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
                  L’acceptation n’ouvre pas de chat automatiquement. Les règles actuelles de messagerie restent inchangées.
                </Text>
                {selectedSuperLike.status === 'PENDING' ? (
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
                  </View>
                ) : null}
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
