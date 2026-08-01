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
  Calendar,
  Coffee,
  CreditCard,
  Crown,
  ExternalLink,
  Flower2,
  Gem,
  Gift,
  Hotel,
  LocateFixed,
  MapPin,
  Martini,
  Palette,
  Rocket,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Utensils
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { useSubscription } from '../../hooks/useSubscription';

const APPS = [
  {
    id: 'sorties',
    titleKey: 'agenda',
    subtitleKey: 'agenda_subtitle',
    icon: Calendar,
    color: '#0ea5e9',
    route: 'AgendaTab',
    tab: true,
  },
  {
    id: 'guide',
    titleKey: 'guide',
    subtitleKey: 'guide_subtitle',
    icon: MapPin,
    color: '#e11d48',
    route: 'Guide',
  },
  {
    id: 'premium',
    titleKey: 'premium_join',
    subtitleKey: 'premium_subtitle',
    icon: Crown,
    color: '#f59e0b',
    route: 'Premium',
  },
  {
    id: 'boost',
    titleKey: 'boost_your_profile',
    subtitleKey: 'boost_subtitle',
    icon: Rocket,
    color: '#7c3aed',
    route: 'Boost',
  },
  {
    id: 'sentinel',
    titleKey: 'sentinel',
    subtitleKey: 'sentinel_subtitle',
    icon: Shield,
    color: '#2563eb',
    route: 'Sentinel',
  },
  {
    id: 'verification',
    titleKey: 'verify_identity',
    subtitleKey: 'certified_badge_desc',
    icon: ShieldCheck,
    color: '#2563eb',
    route: 'Verify',
  },
  {
    id: 'roses',
    titleKey: 'rose_box',
    subtitleKey: 'roses',
    icon: Gem,
    color: '#be123c',
    route: 'LikesReceived',
  },
];

type DiscoveryVenue = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  photo_url?: string;
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

const AppsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
      subtitle: 'Direct Google search for restaurants, lounges and hotels nearby or in a city.',
      placeholder: 'E.g. Abidjan, Douala...',
      search: 'Search',
      locate: 'Use location',
      unlock: 'Unlock for 500 F',
      lockedTitle: 'Free access locked',
      lockedBody: 'Premium members get direct access. Free accounts can unlock this search for 500 F.',
      empty: 'No venue found.',
      maps: 'Maps',
      call: 'Call',
      included: 'Premium included',
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
      subtitle: 'Recherche Google directe pour trouver des restaurants, lounges et hotels proches ou dans une ville.',
      placeholder: 'Ex: Abidjan, Douala...',
      search: 'Chercher',
      locate: 'Me geolocaliser',
      unlock: 'Debloquer 500 F',
      lockedTitle: 'Acces gratuit verrouille',
      lockedBody: 'Les membres Premium y accedent directement. Les comptes gratuits debloquent la recherche pour 500 F.',
      empty: 'Aucune adresse trouvee.',
      maps: 'Maps',
      call: 'Appeler',
      included: 'Inclus Premium',
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

  const fetchDiscovery = async (params: Record<string, string | number>) => {
    if (!hasDiscoveryAccess) {
      Alert.alert(labels.lockedTitle, labels.lockedBody);
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

  const handleCitySearch = () => {
    const cleanCity = city.trim();
    if (!cleanCity) return;
    void fetchDiscovery({ city: cleanCity, category });
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

  const handleUnlock = async () => {
    const ok = await purchaseWithPaystack('PARTNER_DISCOVERY_UNLOCK', 500, 'partner_discovery', {
      targetName: 'Partenaires autour de moi'
    });
    if (ok) {
      await refreshCurrentUser();
      Alert.alert(t('success'), 'Recherche partenaires debloquee.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('apps')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('useful_services_subtitle')}
          </Text>
        </View>

        <View style={[styles.discoveryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.discoveryHeader}>
            <View style={[styles.discoveryIcon, { backgroundColor: '#e11d4818' }]}>
              <MapPin size={24} color="#e11d48" />
            </View>
            <View style={styles.discoveryTitleWrap}>
              <Text style={[styles.discoveryTitle, { color: colors.text }]}>{labels.title}</Text>
              <Text style={[styles.discoverySubtitle, { color: colors.textMuted }]}>{labels.subtitle}</Text>
            </View>
          </View>

          <View style={[styles.accessPill, { backgroundColor: hasDiscoveryAccess ? '#10b98118' : '#f59e0b18' }]}>
            {hasDiscoveryAccess ? <Star size={14} color="#10b981" /> : <CreditCard size={14} color="#f59e0b" />}
            <Text style={[styles.accessText, { color: hasDiscoveryAccess ? '#10b981' : '#f59e0b' }]}>
              {hasDiscoveryAccess ? labels.included : '500 F CFA'}
            </Text>
          </View>

          {!hasDiscoveryAccess && (
            <View style={[styles.lockBox, { backgroundColor: '#f59e0b12' }]}>
              <Text style={[styles.lockTitle, { color: colors.text }]}>{labels.lockedTitle}</Text>
              <Text style={[styles.lockBody, { color: colors.textMuted }]}>{labels.lockedBody}</Text>
              <Pressable style={styles.unlockButton} disabled={purchaseLoading} onPress={handleUnlock}>
                {purchaseLoading ? <ActivityIndicator color="#fff" /> : <CreditCard size={16} color="#fff" />}
                <Text style={styles.unlockText}>{labels.unlock}</Text>
              </Pressable>
            </View>
          )}

          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder={labels.placeholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.cityInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
          />
          <View style={styles.discoveryActions}>
            <Pressable style={[styles.discoveryButton, { backgroundColor: '#111827' }]} disabled={loadingDiscovery || !city.trim()} onPress={handleCitySearch}>
              {loadingDiscovery ? <ActivityIndicator color="#fff" /> : <Search size={16} color="#fff" />}
              <Text style={styles.discoveryButtonText}>{labels.search}</Text>
            </Pressable>
            <Pressable style={[styles.discoveryButton, styles.secondaryButton, { borderColor: colors.border }]} disabled={loadingDiscovery} onPress={handleLocate}>
              <LocateFixed size={16} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{labels.locate}</Text>
            </Pressable>
          </View>

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

          {hasSearched && !loadingDiscovery && venues.length === 0 && (
            <Text style={[styles.emptyDiscovery, { color: colors.textMuted }]}>{labels.empty}</Text>
          )}

          {venues.map((venue) => (
            <View key={venue.id} style={[styles.venueResult, { borderColor: colors.border }]}>
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
        </View>

        <View style={styles.grid}>
          {APPS.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.id}
                style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate(item.route as never)}
              >
                <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                  <Icon size={24} color={item.color} />
                </View>
                <Text style={[styles.appTitle, { color: colors.text }]}>{t(item.titleKey as any)}</Text>
                <Text style={[styles.appSubtitle, { color: colors.textMuted }]}>{t(item.subtitleKey as any)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontFamily: 'PlayfairBlack' },
  subtitle: { marginTop: 6, fontSize: 14, fontFamily: 'InterSemiBold', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  appCard: { width: '48%', minHeight: 156, borderRadius: 20, borderWidth: 1, padding: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  appTitle: { fontSize: 15, fontFamily: 'InterBold', marginBottom: 6 },
  appSubtitle: { fontSize: 12, fontFamily: 'InterSemiBold', lineHeight: 17 },
  discoveryCard: { borderRadius: 24, borderWidth: 1, padding: 16, marginBottom: 20, gap: 14 },
  discoveryHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  discoveryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  discoveryTitleWrap: { flex: 1 },
  discoveryTitle: { fontSize: 18, fontFamily: 'PlayfairBlack' },
  discoverySubtitle: { marginTop: 4, fontSize: 12, fontFamily: 'InterSemiBold', lineHeight: 17 },
  accessPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
  accessText: { fontSize: 10, fontFamily: 'InterBold', textTransform: 'uppercase' },
  lockBox: { borderRadius: 18, padding: 14, gap: 8 },
  lockTitle: { fontSize: 14, fontFamily: 'InterBold' },
  lockBody: { fontSize: 12, fontFamily: 'InterSemiBold', lineHeight: 17 },
  unlockButton: { marginTop: 4, height: 46, borderRadius: 14, backgroundColor: '#e11d48', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  unlockText: { color: '#fff', fontSize: 12, fontFamily: 'InterBold', textTransform: 'uppercase' },
  cityInput: { height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'InterBold' },
  discoveryActions: { flexDirection: 'row', gap: 10 },
  discoveryButton: { flex: 1, minHeight: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  discoveryButtonText: { color: '#fff', fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1 },
  secondaryButtonText: { fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
  categoryList: { gap: 8, paddingVertical: 2 },
  categoryChip: { minHeight: 38, borderRadius: 99, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  categoryChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  categoryText: { fontSize: 10, fontFamily: 'InterBold', textTransform: 'uppercase' },
  categoryTextActive: { color: '#fff' },
  emptyDiscovery: { textAlign: 'center', fontSize: 12, fontFamily: 'InterSemiBold', paddingVertical: 12 },
  venueResult: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
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

export default AppsScreen;
