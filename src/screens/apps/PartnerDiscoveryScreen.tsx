import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import * as Location from 'expo-location';
import {
  Coffee,
  CreditCard,
  ExternalLink,
  Flower2,
  Gift,
  Hotel,
  LocateFixed,
  MapPin,
  Martini,
  Palette,
  Search,
  Star,
  Utensils
} from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { useSubscription } from '../../hooks/useSubscription';

type DiscoveryVenue = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  rating?: number;
  user_ratings_total?: number;
  google_maps_uri?: string | null;
  phone_number?: string | null;
};

type DiscoveryCategory = 'ALL' | 'RESTAURANT' | 'LOUNGE' | 'HOTEL' | 'CAFE' | 'BEAUTY' | 'GIFTS' | 'CULTURE';

const DISCOVERY_CATEGORIES = [
  { id: 'ALL' as DiscoveryCategory, icon: Star },
  { id: 'RESTAURANT' as DiscoveryCategory, icon: Utensils },
  { id: 'LOUNGE' as DiscoveryCategory, icon: Martini },
  { id: 'HOTEL' as DiscoveryCategory, icon: Hotel },
  { id: 'CAFE' as DiscoveryCategory, icon: Coffee },
  { id: 'BEAUTY' as DiscoveryCategory, icon: Flower2 },
  { id: 'GIFTS' as DiscoveryCategory, icon: Gift },
  { id: 'CULTURE' as DiscoveryCategory, icon: Palette },
];

const PartnerDiscoveryScreen: React.FC = () => {
  const { colors, t, language, currentUser, refreshCurrentUser } = useApp();
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();
  const [city, setCity] = React.useState('');
  const [venues, setVenues] = React.useState<DiscoveryVenue[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [category, setCategory] = React.useState<DiscoveryCategory>('ALL');
  const hasDiscoveryAccess = !!(currentUser?.is_premium || currentUser?.is_vip || currentUser?.partner_discovery_unlocked);

  const labels = language === 'en'
    ? {
      title: 'Partners near me',
      subtitle: 'Find useful places for dates, outings and thoughtful gestures.',
      placeholder: 'E.g. Abidjan, Douala...',
      search: 'Search this city',
      locate: 'Use location',
      payTitle: 'Paid feature',
      payBody: 'Premium members get direct access. Free accounts can unlock this search for 500 F CFA.',
      unlock: 'Unlock',
      empty: 'No venue found.',
      maps: 'Maps',
      call: 'Call',
      categories: {
        ALL: 'All',
        RESTAURANT: 'Restaurants',
        LOUNGE: 'Lounges',
        HOTEL: 'Hotels',
        CAFE: 'Cafes',
        BEAUTY: 'Spa & Beauty',
        GIFTS: 'Flowers & Gifts',
        CULTURE: 'Culture & Leisure'
      }
    }
    : {
      title: 'Partenaires autour de moi',
      subtitle: 'Trouvez des lieux utiles pour vos sorties, rendez-vous et attentions.',
      placeholder: 'Ex: Abidjan, Douala...',
      search: 'Chercher cette ville',
      locate: 'Me geolocaliser',
      payTitle: 'Fonctionnalite payante',
      payBody: 'Les membres Premium y accedent directement. Les comptes gratuits debloquent cette recherche pour 500 F CFA.',
      unlock: 'Debloquer',
      empty: 'Aucune adresse trouvee.',
      maps: 'Maps',
      call: 'Appeler',
      categories: {
        ALL: 'Tous',
        RESTAURANT: 'Restaurants',
        LOUNGE: 'Lounges',
        HOTEL: 'Hotels',
        CAFE: 'Cafes',
        BEAUTY: 'Spa & Beaute',
        GIFTS: 'Fleurs & Cadeaux',
        CULTURE: 'Culture & Loisirs'
      }
    };

  const promptUnlock = () => {
    Alert.alert(labels.payTitle, labels.payBody, [
      { text: 'OK', style: 'cancel' },
      {
        text: labels.unlock,
        onPress: async () => {
          const ok = await purchaseWithPaystack('PARTNER_DISCOVERY_UNLOCK', 500, 'partner_discovery', {
            targetName: 'Partenaires autour de moi'
          });
          if (ok) {
            await refreshCurrentUser();
            Alert.alert(t('success'), 'Recherche partenaires debloquee.');
          }
        }
      }
    ]);
  };

  const fetchDiscovery = async (params: Record<string, string | number>) => {
    if (!hasDiscoveryAccess) {
      promptUnlock();
      return;
    }

    try {
      setLoadingDiscovery(true);
      setHasSearched(true);
      const query = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      const res = await apiRequest<{ venues: DiscoveryVenue[] }>(`/api/venues/partner-discovery/google?${query}`, {
        requireAuth: true
      });
      setVenues(res.venues || []);
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || 'Recherche indisponible.');
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleLocate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('error'), 'Geolocalisation refusee.');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    void fetchDiscovery({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      radiusKm: 15,
      category
    });
  };

  const handleCitySearch = () => {
    const cleanCity = city.trim();
    if (!cleanCity) return;
    void fetchDiscovery({ city: cleanCity, category });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: '#e11d4818' }]}>
            <MapPin size={24} color="#e11d48" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{labels.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{labels.subtitle}</Text>
          </View>
        </View>

        <Pressable style={styles.locateButton} disabled={loadingDiscovery || purchaseLoading} onPress={handleLocate}>
          {loadingDiscovery || purchaseLoading ? <ActivityIndicator color="#fff" /> : <LocateFixed size={18} color="#fff" />}
          <Text style={styles.locateButtonText}>{labels.locate}</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {DISCOVERY_CATEGORIES.map((item) => {
            const Icon = item.icon;
            const active = category === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.categoryChip, { borderColor: colors.border }, active && styles.categoryChipActive]}
                onPress={() => setCategory(item.id)}
              >
                <Icon size={14} color={active ? '#fff' : colors.textMuted} />
                <Text style={[styles.categoryText, { color: colors.textMuted }, active && styles.categoryTextActive]}>
                  {labels.categories[item.id]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={labels.placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.cityInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
        />
        <Pressable style={[styles.searchButton, { opacity: city.trim() ? 1 : 0.5 }]} disabled={loadingDiscovery || purchaseLoading || !city.trim()} onPress={handleCitySearch}>
          {loadingDiscovery || purchaseLoading ? <ActivityIndicator color="#fff" /> : <Search size={16} color="#fff" />}
          <Text style={styles.searchButtonText}>{labels.search}</Text>
        </Pressable>

        {hasSearched && !loadingDiscovery && venues.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{labels.empty}</Text>
        )}

        {venues.map((venue) => (
          <View key={venue.id} style={[styles.venueResult, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.venueResultHeader}>
              <View style={styles.venueTextWrap}>
                <Text style={[styles.venueName, { color: colors.text }]}>{venue.name}</Text>
                <Text style={[styles.venueAddress, { color: colors.textMuted }]}>{venue.address || venue.city}</Text>
              </View>
              <View style={styles.ratingPill}>
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.ratingText}>{Number(venue.rating || 0).toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.resultActions}>
              {venue.google_maps_uri ? (
                <Pressable style={styles.resultLink} onPress={() => Linking.openURL(venue.google_maps_uri!)}>
                  <ExternalLink size={13} color="#111827" />
                  <Text style={styles.resultLinkText}>{labels.maps}</Text>
                </Pressable>
              ) : null}
              {venue.phone_number ? (
                <Pressable style={styles.resultLink} onPress={() => Linking.openURL(`tel:${venue.phone_number}`)}>
                  <Text style={styles.resultLinkText}>{labels.call}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 14 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 28, fontFamily: 'PlayfairBlack' },
  subtitle: { marginTop: 4, fontSize: 13, fontFamily: 'InterSemiBold', lineHeight: 18 },
  locateButton: { minHeight: 52, borderRadius: 16, backgroundColor: '#e11d48', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  locateButtonText: { color: '#fff', fontSize: 12, fontFamily: 'InterBold', textTransform: 'uppercase' },
  categoryList: { gap: 8, paddingVertical: 2 },
  categoryChip: { minHeight: 38, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  categoryChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  categoryText: { fontSize: 10, fontFamily: 'InterBold', textTransform: 'uppercase' },
  categoryTextActive: { color: '#fff' },
  cityInput: { height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'InterBold' },
  searchButton: { minHeight: 46, borderRadius: 14, backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchButtonText: { color: '#fff', fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', fontSize: 12, fontFamily: 'InterSemiBold', paddingVertical: 16 },
  venueResult: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  venueResultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  venueTextWrap: { flex: 1 },
  venueName: { fontSize: 14, fontFamily: 'InterBold' },
  venueAddress: { marginTop: 3, fontSize: 11, fontFamily: 'InterSemiBold', lineHeight: 15 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, backgroundColor: '#f59e0b18', paddingHorizontal: 8, paddingVertical: 5 },
  ratingText: { color: '#f59e0b', fontSize: 11, fontFamily: 'InterBold' },
  resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultLink: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8 },
  resultLinkText: { color: '#111827', fontSize: 10, fontFamily: 'InterBold', textTransform: 'uppercase' },
});

export default PartnerDiscoveryScreen;
