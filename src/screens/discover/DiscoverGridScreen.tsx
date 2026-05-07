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
import { useFocusEffect } from '@react-navigation/native';
import { Rocket, Star } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import ProfileBadges from '../../components/ProfileBadges';

type DiscoverSuggestion = {
  id: string;
  name: string;
  age: number;
  photos: string[];
  city: string | null;
  score: number;
  is_verified: boolean;
  is_premium: boolean;
  super_liked_me: boolean;
  boosted_until: string | null;
  last_active_at?: string | null;
  likes_count: number;
  distance_km: number | null;
};

type DiscoverResponse = {
  suggestions: DiscoverSuggestion[];
};

const MATCHMAKING_LIMIT = 80;

const DiscoverGridScreen: React.FC = () => {
  const { currentUser } = useApp();
  const [profiles, setProfiles] = useState<DiscoverSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGridSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest<DiscoverResponse>(
        `/api/matchmaking/suggestions?limit=${MATCHMAKING_LIMIT}`,
        { requireAuth: true }
      );
      setProfiles(response.suggestions || []);
    } catch (_error) {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!currentUser) return () => {};
      void fetchGridSuggestions();
      return () => {};
    }, [currentUser, fetchGridSuggestions])
  );

  if (!currentUser) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Grille Decouverte</Text>
        <Text style={styles.subtitle}>
          {profiles.length} profils visibles simultanement
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des suggestions...</Text>
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>Aucun profil a afficher pour le moment.</Text>
          <Pressable style={styles.reloadButton} onPress={() => void fetchGridSuggestions()}>
            <Text style={styles.reloadButtonText}>Recharger</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {profiles.map((profile) => {
            const isBoosted = profile.boosted_until && new Date(profile.boosted_until) > new Date();
            const coverPhoto = profile.photos?.[0]
              || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=640&auto=format&fit=crop';
            return (
              <View key={profile.id} style={styles.card}>
                <Image source={{ uri: coverPhoto }} style={styles.photo} />

                <View style={styles.badgesOverlay}>
                  <ProfileBadges
                    user={{
                      ...profile,
                      isVerified: profile.is_verified,
                    } as any}
                  />
                </View>

                {profile.super_liked_me ? (
                  <View style={styles.superLikeBadge}>
                    <Star size={12} color="#fff" fill="#fff" />
                  </View>
                ) : null}

                {isBoosted ? (
                  <View style={styles.boostIcon}>
                    <Rocket size={12} color="#fff" />
                  </View>
                ) : null}

                <View style={styles.metaOverlay}>
                  <Text style={styles.name} numberOfLines={1}>
                    {profile.name}, {profile.age}
                  </Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {profile.city || 'Ville non renseignee'}
                    {typeof profile.distance_km === 'number' ? ` • ${profile.distance_km.toFixed(1)} km` : ''}
                  </Text>
                  <Text style={styles.scoreText}>Score {Math.round(profile.score)}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 4,
  },
  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  loadingText: {
    color: COLORS.muted,
    fontWeight: '700',
    textAlign: 'center',
  },
  reloadButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  reloadButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
    gap: 10,
  },
  card: {
    width: '45%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  badgesOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
  },
  superLikeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 999,
    padding: 5,
  },
  boostIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 999,
    padding: 4,
  },
  metaOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaText: {
    marginTop: 2,
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreText: {
    marginTop: 2,
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '900',
  },
});

export default DiscoverGridScreen;
