import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, Pressable, Dimensions, Alert, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft, MapPin, MessageCircle, Star, Sparkles, Navigation as NavigationIcon } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import * as Linking from 'expo-linking';

const { width } = Dimensions.get('window');

const VenueDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors, activeTheme, t } = useApp();
  const { venue } = route.params;

  const photos = Array.isArray(venue.photos) && venue.photos.length > 0 ? venue.photos : [venue.photo_url];

  const startVenueChat = async () => {
    try {
      const res = await apiRequest<{ venueChatId: string }>(`/api/venues/${venue.id}/chat-thread`, {
        method: 'POST',
        requireAuth: true
      });
      navigation.navigate('Chat', { venueChatId: res.venueChatId, venueName: venue.name, venuePhoto: venue.photo_url });
    } catch (e: any) {
      Alert.alert(t('error'), t('chat_error'));
    }
  };

  const openInMaps = () => {
    const { latitude, longitude, name, address } = venue;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: latitude ? `maps:0,0?q=${label}@${latitude},${longitude}` : `maps:0,0?q=${encodeURIComponent(address)}`,
      android: latitude ? `geo:0,0?q=${latitude},${longitude}(${label})` : `geo:0,0?q=${encodeURIComponent(address)}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.text} size={28} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {photos.map((photo: string, index: number) => (
            <Image key={index} source={{ uri: photo }} style={styles.galleryImage} />
          ))}
        </ScrollView>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>{venue.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[styles.locationText, { color: colors.textMuted }]}>{venue.address}, {venue.city}</Text>
              </View>
              <Pressable style={styles.mapBtn} onPress={openInMaps}>
                <NavigationIcon size={14} color="#0ea5e9" />
                <Text style={styles.mapBtnText}>{t('itinerary')}</Text>
              </Pressable>
            </View>
            <View style={styles.ratingBox}>
              <Star size={16} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.ratingText}>4.9</Text>
            </View>
          </View>

          <View style={[styles.benefitCard, { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2', borderColor: activeTheme === 'dark' ? '#9f1239' : '#fecdd3' }]}>
            <View style={styles.benefitHeader}>
              <Sparkles size={18} color="#e11d48" />
              <Text style={styles.benefitTitle}>{t('gallant_benefit')}</Text>
            </View>
            <Text style={[styles.benefitDesc, { color: activeTheme === 'dark' ? '#fb7185' : '#9f1239' }]}>
              {venue.benefit_description || t('no_benefit')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about')}</Text>
            <Text style={[styles.description, { color: colors.text }]}>
              {venue.description || t('no_description')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable style={styles.chatBtn} onPress={startVenueChat}>
          <MessageCircle color="#fff" size={20} />
          <Text style={styles.chatBtnText}>{t('chat_host')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlayfairBlack', flex: 1, textAlign: 'center' },
  gallery: { height: 250 },
  galleryImage: { width: width, height: 250, backgroundColor: '#f1f5f9' },
  content: { padding: 20, gap: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 24, fontFamily: 'PlayfairBlack' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 14, fontFamily: 'InterSemiBold' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  mapBtnText: { color: '#0ea5e9', fontSize: 13, fontFamily: 'InterBold' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ratingText: { fontSize: 14, fontFamily: 'InterBold', color: '#b45309' },
  benefitCard: { padding: 16, borderRadius: 20, borderWidth: 1, gap: 8 },
  benefitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitTitle: { fontSize: 14, fontFamily: 'InterBold', color: '#e11d48', textTransform: 'uppercase' },
  benefitDesc: { fontSize: 16, fontFamily: 'InterBold' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontFamily: 'PlayfairBlack' },
  description: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter', opacity: 0.8 },
  footer: { padding: 16, borderTopWidth: 1 },
  chatBtn: { backgroundColor: '#e11d48', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  chatBtnText: { color: '#fff', fontSize: 16, fontFamily: 'InterBold' },
});

export default VenueDetailScreen;
