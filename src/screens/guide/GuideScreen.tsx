import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Search, MapPin, Utensils, Coffee, Music, Scissors, Flower2, TreePine, Sparkles } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { useApp } from '../../state/AppContext';

const CATEGORIES = [
  { id: 'ALL', labelKey: 'all' as const, icon: Search },
  { id: 'RESTAURANT', labelKey: 'gastronomy' as const, icon: Utensils },
  { id: 'CAFE', labelKey: 'gastronomy' as const, icon: Coffee }, // Could be more specific if keys existed
  { id: 'BAR', labelKey: 'nightlife' as const, icon: Music },
  { id: 'HAIR_MALE', labelKey: 'beauty' as const, icon: Scissors },
  { id: 'HAIR_FEMALE', labelKey: 'beauty' as const, icon: Scissors },
  { id: 'FLORIST', labelKey: 'attentions' as const, icon: Flower2 },
  { id: 'PARK', labelKey: 'culture' as const, icon: TreePine },
];

interface Venue {
  id: string;
  name: string;
  venue_type: string;
  city: string;
  address: string;
  benefit_description: string;
  photo_url: string;
  description: string;
  photos?: string[];
}

const GuideScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, activeTheme, t } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [recommendations, setRecommendations] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory !== 'ALL' ? `&type=${selectedCategory}` : '';
      const res = await apiRequest<{ venues: Venue[] }>(`/api/venues?${categoryParam}`, { requireAuth: true });
      setVenues(res.venues || []);
    } catch (e) {
      console.error('Error fetching venues', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await apiRequest<{ venues: Venue[] }>('/api/venues/recommendations', { requireAuth: true });
      setRecommendations(res.venues || []);
    } catch (e) {
      console.error('Error fetching recommendations', e);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchRecommendations();
    }, [])
  );

  const handleVenuePress = (item: Venue) => {
    navigation.navigate('VenueDetail', { venue: item });
  };

  const renderVenueCard = (item: Venue, isRecommendation = false) => (
    <Pressable
      key={item.id}
      style={[styles.venueCard, { backgroundColor: colors.card, borderColor: colors.border }, isRecommendation && styles.recommendationCard]}
      onPress={() => handleVenuePress(item)}
    >
      <Image source={{ uri: item.photo_url || 'https://placehold.co/300x200' }} style={[styles.venueImage, { backgroundColor: colors.input }]} />
      <View style={styles.venueInfo}>
        <Text style={[styles.venueName, { color: colors.text }]}>{item.name}</Text>
        <View style={styles.locationRow}>
          <MapPin size={12} color={colors.textMuted} />
          <Text style={[styles.locationText, { color: colors.textMuted }]}>{item.city}</Text>
        </View>
        <View style={[styles.benefitTag, { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2' }]}>
          <Text style={[styles.benefitText, { color: activeTheme === 'dark' ? '#fb7185' : '#e11d48' }]}>🎁 {item.benefit_description}</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('guide')} Galant 🌹</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('guide_subtitle')}</Text>
      </View>

      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCategory === cat.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <cat.icon size={16} color={selectedCategory === cat.id ? '#fff' : colors.textMuted} />
              <Text style={[styles.categoryText, { color: colors.textMuted }, selectedCategory === cat.id && styles.categoryTextActive]}>{t(cat.labelKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {recommendations.length > 0 && selectedCategory === 'ALL' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={20} color="#e11d48" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('suggestions_for_you')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationsList}>
              {recommendations.map(v => renderVenueCard(v, true))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{selectedCategory === 'ALL' ? t('all_venues') : t('results')}</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : venues.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('no_venue_found')}</Text>
          ) : (
            <View style={styles.venuesGrid}>
              {venues.map(v => renderVenueCard(v))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 20 },
  title: { fontSize: 28, fontFamily: 'PlayfairBlack' },
  subtitle: { fontSize: 14, fontFamily: 'InterSemiBold', marginTop: 4 },
  categoriesWrapper: { marginBottom: 10 },
  categories: { paddingHorizontal: 20, gap: 10 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, borderWidth: 1 },
  categoryChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  categoryText: { fontSize: 13, fontFamily: 'InterBold' },
  categoryTextActive: { color: '#fff' },
  content: { paddingBottom: 30 },
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontFamily: 'PlayfairBlack', paddingHorizontal: 20, marginBottom: 15 },
  recommendationsList: { paddingHorizontal: 20, gap: 15 },
  venuesGrid: { paddingHorizontal: 20, gap: 15 },
  venueCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  recommendationCard: { width: 280 },
  venueImage: { width: '100%', height: 150 },
  venueInfo: { padding: 12, gap: 4 },
  venueName: { fontSize: 16, fontFamily: 'InterBold' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, fontFamily: 'InterSemiBold' },
  benefitTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  benefitText: { fontSize: 11, fontFamily: 'InterBold' },
  emptyText: { textAlign: 'center', marginTop: 20, fontFamily: 'Inter' },
});

export default GuideScreen;
