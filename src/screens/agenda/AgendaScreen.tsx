import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Sparkles,
  Zap,
  ChevronRight,
  X,
  Utensils,
  Music,
  Scissors,
  Flower2,
  Palette,
} from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { useApp } from '../../state/AppContext';

const AMBIANCES = [
  { id: 'ALL', labelKey: 'all' as const, icon: Sparkles },
  { id: 'GASTRONOMY', types: ['RESTAURANT', 'CAFE'], labelKey: 'gastronomy' as const, icon: Utensils },
  { id: 'NIGHTLIFE', types: ['BAR', 'CLUB'], labelKey: 'nightlife' as const, icon: Music },
  { id: 'BEAUTY', types: ['HAIR_MALE', 'HAIR_FEMALE'], labelKey: 'beauty' as const, icon: Scissors },
  { id: 'ATTENTIONS', types: ['FLORIST'], labelKey: 'attentions' as const, icon: Flower2 },
  { id: 'CULTURE', types: ['PARK', 'OTHER'], labelKey: 'culture' as const, icon: Palette },
];

interface VenueEvent {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  photo_url: string;
  event_type: 'EVENT' | 'FLASH_OFFER';
  starts_at: string;
  expires_at: string;
  venues: {
    name: string;
    city: string;
    address: string;
    photo_url: string;
    venue_type: string;
    benefit_description: string;
  };
}

const AgendaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { matches, users, currentUser, colors, activeTheme, t } = useApp();
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmbiance, setSelectedAmbiance] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState<VenueEvent | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  const userCity = currentUser?.city || 'Ma Ville';
  const userCountry = currentUser?.country || '';

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ events: VenueEvent[] }>(`/api/agenda/events?city=${userCity}`, { requireAuth: true });
      setEvents(res.events || []);
    } catch (e) {
      console.error('Error fetching agenda', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void fetchEvents();
    }, [userCity])
  );

  const filteredEvents = useMemo(() => {
    if (selectedAmbiance === 'ALL') return events;
    const ambiance = AMBIANCES.find(a => a.id === selectedAmbiance);
    if (!ambiance || !ambiance.types) return events;
    return events.filter(e => ambiance.types?.includes(e.venues?.venue_type));
  }, [events, selectedAmbiance]);

  const flashOffers = useMemo(() =>
    filteredEvents.filter(e => e.event_type === 'FLASH_OFFER'),
  [filteredEvents]);

  const mainEvents = useMemo(() =>
    filteredEvents.filter(e => e.event_type === 'EVENT'),
  [filteredEvents]);

  const groupedEvents = useMemo(() => {
    const todayStr = new Date().toDateString();
    const tomorrowStr = new Date(Date.now() + 86400000).toDateString();

    return mainEvents.reduce((acc: any, ev) => {
      const dateStr = new Date(ev.starts_at).toDateString();
      let label = new Date(ev.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      if (dateStr === todayStr) label = t('today');
      else if (dateStr === tomorrowStr) label = t('tomorrow');

      if (!acc[label]) acc[label] = [];
      acc[label].push(ev);
      return acc;
    }, {});
  }, [mainEvents, t]);

  const activeMatches = matches.map(m => {
    const otherId = m.user_one_id === currentUser?.id ? m.user_two_id : m.user_one_id;
    const user = users.find(u => u.id === otherId);
    return { matchId: m.id, user };
  }).filter(m => !!m.user);

  const handleShareToMatch = async (matchId: string, event: VenueEvent) => {
    try {
      setSharing(true);
      await apiRequest('/api/messages/send', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          matchId,
          messageType: 'EVENT_SUGGESTION',
          content: `${t('scented_note')} : ${event.title} ?`,
          metadata: { event }
        })
      });
      setShowMatchModal(false);
      Alert.alert(t('sent_success'), t('suggestion_sent'));
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSharing(false);
    }
  };

  const renderFlashOffer = (item: VenueEvent) => (
    <Pressable key={item.id} style={[styles.flashCard, { backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#000' }]} onPress={() => Alert.alert(item.title, item.description)}>
      <Image source={{ uri: item.photo_url || item.venues.photo_url }} style={styles.flashImage} />
      <View style={styles.flashContent}>
        <View style={styles.flashBadge}>
          <Zap size={10} color="#fff" fill="#fff" />
          <Text style={styles.flashBadgeText}>{t('flash_offer')}</Text>
        </View>
        <Text style={styles.flashTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.flashVenue, { color: activeTheme === 'dark' ? colors.textMuted : 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>{item.venues.name}</Text>
      </View>
    </Pressable>
  );

  const renderEventItem = (item: VenueEvent) => (
    <View key={item.id} style={[styles.eventItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: item.photo_url || item.venues.photo_url }} style={styles.eventImage} />
      <View style={styles.eventBody}>
        <div style={styles.eventVenueRow}>
          <Text style={[styles.eventVenueName, { color: colors.textMuted }]}>{item.venues.name}</Text>
          <View style={[styles.certBadge, { backgroundColor: activeTheme === 'dark' ? '#451a03' : '#fef3c7' }]}><Sparkles size={10} color="#b45309" /></View>
        </div>
        <Text style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
        <View style={styles.eventMeta}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[styles.eventMetaText, { color: colors.textMuted }]}>{new Date(item.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
          <MapPin size={12} color={colors.textMuted} style={{ marginLeft: 10 }} />
          <Text style={[styles.eventMetaText, { color: colors.textMuted }]}>{item.venues.address}</Text>
        </View>
        <View style={[styles.eventBenefitBox, { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2' }]}>
          <Text style={[styles.eventBenefitText, { color: activeTheme === 'dark' ? '#fb7185' : '#9f1239' }]}>🎁 {item.venues.benefit_description}</Text>
        </View>
        <Pressable style={[styles.proposeBtn, { borderTopColor: colors.border }]} onPress={() => { setSelectedEvent(item); setShowMatchModal(true); }}>
          <Share2 size={14} color="#e11d48" />
          <Text style={styles.proposeBtnText}>{t('propose_match')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('agenda')} à {userCity}</Text>
            {userCountry ? <Text style={styles.countryFlag}> 🇨🇮</Text> : null}
          </View>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{t('agenda_subtitle')}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ambianceRow}>
          {AMBIANCES.map((amb) => (
            <Pressable
              key={amb.id}
              style={[
                styles.ambianceChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedAmbiance === amb.id && styles.ambianceChipActive
              ]}
              onPress={() => setSelectedAmbiance(amb.id)}
            >
              <amb.icon size={18} color={selectedAmbiance === amb.id ? '#fff' : colors.textMuted} />
              <Text style={[styles.ambianceText, { color: colors.textMuted }, selectedAmbiance === amb.id && styles.ambianceTextActive]}>{t(amb.labelKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {flashOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('instant_moment')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashList}>
              {flashOffers.map(renderFlashOffer)}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('no_venue_found')}</Text>
          </View>
        ) : (
          <View style={styles.mainFeed}>
            {Object.keys(groupedEvents).map(dateLabel => (
              <View key={dateLabel} style={styles.dateGroup}>
                <Text style={styles.dateLabel}>{dateLabel}</Text>
                {groupedEvents[dateLabel].map((ev: VenueEvent) => renderEventItem(ev))}
              </View>
            ))}
          </View>
        )}

        <Pressable style={[styles.footerPartner, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('PartnerDashboard')}>
          <Text style={[styles.footerPartnerText, { color: colors.textMuted }]}>{t('partner_footer')}</Text>
          <View style={styles.footerPartnerLink}>
            <Text style={styles.footerPartnerLinkText}>{t('join_guide')}</Text>
            <ChevronRight size={16} color="#e11d48" />
          </View>
        </Pressable>
      </ScrollView>

      <Modal visible={showMatchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('propose_match')}</Text>
              <Pressable onPress={() => setShowMatchModal(false)}><X size={24} color={colors.text} /></Pressable>
            </View>
            <FlatList
              data={activeMatches}
              keyExtractor={m => m.matchId}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.matchRow, { borderBottomColor: colors.border }]}
                  onPress={() => selectedEvent && handleShareToMatch(item.matchId, selectedEvent)}
                  disabled={sharing}
                >
                  <Image source={{ uri: item.user?.photos[0] }} style={styles.matchAvatar} />
                  <Text style={[styles.matchName, { color: colors.text }]}>{item.user?.name}</Text>
                  <ChevronRight size={20} color={colors.textMuted} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('no_more_profiles')}</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontFamily: 'PlayfairBlack' },
  countryFlag: { fontSize: 22 },
  headerSub: { fontSize: 14, marginTop: 4, fontFamily: 'InterSemiBold' },
  ambianceRow: { paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  ambianceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  ambianceChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  ambianceText: { fontSize: 13, fontFamily: 'InterBold' },
  ambianceTextActive: { color: '#fff' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontFamily: 'PlayfairBlack', paddingHorizontal: 20, marginBottom: 15 },
  flashList: { paddingHorizontal: 20, gap: 15 },
  flashCard: { width: 200, height: 120, borderRadius: 20, overflow: 'hidden' },
  flashImage: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
  flashContent: { flex: 1, padding: 12, justifyContent: 'flex-end' },
  flashBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#e11d48', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  flashBadgeText: { color: '#fff', fontSize: 8, fontFamily: 'InterBold' },
  flashTitle: { color: '#fff', fontSize: 14, fontFamily: 'InterBold' },
  flashVenue: { fontSize: 11, fontFamily: 'InterSemiBold' },
  mainFeed: { paddingHorizontal: 20 },
  dateGroup: { marginBottom: 25 },
  dateLabel: { fontSize: 13, fontFamily: 'InterBold', color: '#e11d48', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  eventItem: { borderRadius: 24, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
  eventImage: { width: '100%', height: 160, backgroundColor: '#f1f5f9' },
  eventBody: { padding: 16, gap: 8 },
  eventVenueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventVenueName: { fontSize: 11, fontFamily: 'InterBold', textTransform: 'uppercase' },
  certBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 19, fontFamily: 'Playfair' },
  eventMeta: { flexDirection: 'row', alignItems: 'center' },
  eventMetaText: { fontSize: 12, fontFamily: 'InterSemiBold', marginLeft: 4 },
  eventBenefitBox: { padding: 10, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#e11d48' },
  eventBenefitText: { fontSize: 13, fontFamily: 'InterBold' },
  proposeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, marginTop: 8 },
  proposeBtnText: { color: '#e11d48', fontSize: 14, fontFamily: 'InterBold' },
  footerPartner: { margin: 20, padding: 25, borderRadius: 24, alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed' },
  footerPartnerText: { fontSize: 14, fontFamily: 'InterSemiBold', textAlign: 'center' },
  footerPartnerLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerPartnerLinkText: { color: '#e11d48', fontSize: 15, fontFamily: 'InterBold' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 15 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingHorizontal: 40, lineHeight: 20, fontFamily: 'Inter' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'PlayfairBlack' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  matchAvatar: { width: 44, height: 44, borderRadius: 22 },
  matchName: { flex: 1, fontSize: 16, fontFamily: 'InterBold' },
});

export default AgendaScreen;
