import React, { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Rocket, Star, Search, SlidersHorizontal } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import ProfileBadges from '../../components/ProfileBadges';
import type { RootStackParamList } from '../../navigation/MainNavigator';

type DiscoverSuggestion = { id: string; name: string; age: number; photos: string[]; city: string | null; score: number; is_verified: boolean; is_premium: boolean; super_liked_me: boolean; boosted_until: string | null; distance_km: number | null; current_user?: boolean; };
type DiscoverResponse = { suggestions: DiscoverSuggestion[]; current_user_rank?: number | null; };
type Nav = NativeStackNavigationProp<RootStackParamList>;
const MATCHMAKING_LIMIT = 80;

const DiscoverGridScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { currentUser, appResumeVersion, colors, t } = useApp();
  const [profiles, setProfiles] = useState<DiscoverSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const includeSelf = !!route.params?.includeSelf;

  const fetchGridSuggestions = useCallback(async (q = searchQuery) => {
    try {
      setLoading(true);
      const searchParam = q.trim() ? `&search=${encodeURIComponent(q.trim())}` : '';
      const includeSelfParam = includeSelf ? '&includeSelf=true' : '';
      const res = await apiRequest<DiscoverResponse>(`/api/matchmaking/suggestions?limit=${MATCHMAKING_LIMIT}${includeSelfParam}${searchParam}`, { requireAuth: true });
      setProfiles(res.suggestions || []);
      setCurrentUserRank(res.current_user_rank ?? null);
    } catch { setProfiles([]); setCurrentUserRank(null); } finally { setLoading(false); }
  }, [includeSelf, searchQuery]);

  useFocusEffect(useCallback(() => { if (currentUser) void fetchGridSuggestions(); }, [currentUser, fetchGridSuggestions, appResumeVersion]));
  if (!currentUser) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('discover_grid')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{includeSelf && currentUserRank ? t('boost_rank', { rank: currentUserRank }) : t('profiles_visible', { count: profiles.length })}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchGridSuggestions(searchQuery)}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.loadingText}>{t('loading_suggestions')}</Text></View>
      ) : profiles.length === 0 ? (
        <View style={styles.loadingCard}><Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('no_profiles_to_show')}</Text><Pressable style={styles.reloadButton} onPress={() => void fetchGridSuggestions()}><Text style={styles.reloadButtonText}>{t('reload')}</Text></Pressable></View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {profiles.map((profile) => (
            <Pressable key={profile.id} style={[styles.card, { backgroundColor: colors.card }, profile.current_user && styles.myCard]} onPress={() => profile.current_user ? Alert.alert(t('your_position'), t('boost_grid_desc')) : navigation.navigate('ProfileDetail', { profile })}>
              <Image source={{ uri: profile.photos?.[0] || 'https://placehold.co/300x400' }} style={styles.photo} />
              <View style={styles.badgesOverlay}><ProfileBadges user={{ ...profile, isVerified: profile.is_verified } as any} /></View>
              {profile.super_liked_me && <View style={styles.superLikeBadge}><Star size={12} color="#fff" fill="#fff" /></View>}
              {profile.boosted_until && new Date(profile.boosted_until) > new Date() && <View style={styles.boostIcon}><Rocket size={12} color="#fff" /></View>}
              {profile.current_user && <View style={styles.meBadge}><Text style={styles.meBadgeText}>{t('you')}</Text></View>}
              <View style={styles.metaOverlay}>
                <Text style={styles.name} numberOfLines={1}>{profile.name}, {profile.age}</Text>
                <Text style={styles.metaText} numberOfLines={1}>{profile.city || t('city_not_set')}{typeof profile.distance_km === 'number' ? ` • ${profile.distance_km.toFixed(1)} km` : ''}</Text>
                <Text style={styles.scoreText}>{profile.current_user ? t('boosted_position') : `${t('score')} ${Math.round(profile.score)}`}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 4 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 46, borderRadius: 14, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  loadingCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  loadingText: { fontWeight: '700', textAlign: 'center' },
  reloadButton: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary },
  reloadButtonText: { color: '#fff', fontWeight: '800' },
  grid: { flexDirection: 'column', padding: 10, gap: 10 },
  card: { width: '100%', aspectRatio: 3 / 4, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  myCard: { borderColor: '#8b5cf6' },
  photo: { width: '100%', height: '100%' },
  badgesOverlay: { position: 'absolute', top: 8, left: 8, zIndex: 2 },
  superLikeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#f59e0b', borderRadius: 999, padding: 5 },
  boostIcon: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#8b5cf6', borderRadius: 999, padding: 4 },
  meBadge: { position: 'absolute', top: 40, right: 8, backgroundColor: '#8b5cf6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  meBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  metaOverlay: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  name: { color: '#fff', fontSize: 14, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  metaText: { marginTop: 2, color: '#e2e8f0', fontSize: 11, fontWeight: '700' },
  scoreText: { marginTop: 2, color: '#fef08a', fontSize: 11, fontWeight: '900' },
});

export default DiscoverGridScreen;

