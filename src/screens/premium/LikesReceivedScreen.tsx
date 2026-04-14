import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Heart, Star } from 'lucide-react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';

type LikeRow = {
  liker_id: string;
  is_super_like: boolean;
  created_at: string;
  user: {
    id: string;
    name: string;
    age: number;
    gender: string;
    city: string | null;
    photos: string[];
    interests: string[];
    is_verified: boolean;
    is_premium: boolean;
  };
};

const LikesReceivedScreen: React.FC = () => {
  const navigation = useNavigation();
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLikes = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<{ likes: LikeRow[] }>('/api/premium/likes-received', {
        requireAuth: true,
      });
      const sortedLikes = [...(payload.likes || [])].sort((left, right) => {
        if (left.is_super_like !== right.is_super_like) {
          return left.is_super_like ? -1 : 1;
        }
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
      setLikes(sortedLikes);
      setError(null);
    } catch (err: any) {
      setLikes([]);
      setError(err?.message || 'Impossible de charger les likes reçus.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchLikes();
    }, [fetchLikes])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Qui a liké mon profil</Text>
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
              <View key={`${row.liker_id}:${row.created_at}`} style={styles.card}>
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
                    {row.is_super_like ? <Star size={16} color="#f59e0b" fill="#f59e0b" /> : <Heart size={16} color="#ef4444" />}
                  </View>
                  <Text style={styles.meta}>{row.user.city || 'Ville non renseignée'}</Text>
                  <Text style={styles.meta}>Reçu le {new Date(row.created_at).toLocaleString('fr-FR')}</Text>
                  <Text style={[styles.meta, row.is_super_like && styles.superLikeLabel]}>
                    {row.is_super_like ? 'Super Like prioritaire' : 'Like standard'}
                  </Text>
                  <View style={styles.tags}>
                    {(row.user.interests || []).slice(0, 4).map((interest) => (
                      <Text key={interest} style={styles.tag}>{interest}</Text>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
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
  },
  error: {
    color: '#b91c1c',
    fontWeight: '700',
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
    height: 92,
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
  superLikeLabel: {
    color: '#b45309',
    fontWeight: '800',
  },
  tags: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
});

export default LikesReceivedScreen;
