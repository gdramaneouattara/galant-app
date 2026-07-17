import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Sparkles, ChevronRight, Bell } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';
import { db, COLLECTIONS } from '../../lib/firebase';
import * as ImagePicker from 'expo-image-picker';
import { uploadArrayBufferToBucket, getPublicUrl } from '../../lib/storageUpload';

// Components
import PartnerHeader from './components/PartnerHeader';
import VenueGallery from './components/VenueGallery';
import VenueStatusCard from './components/VenueStatusCard';
import PartnerEventManager from './components/PartnerEventManager';
import PartnerChatList from './components/PartnerChatList';
import VenueAnalytics from './components/VenueAnalytics';
import VenueEditModal from './components/VenueEditModal';

interface VenueData {
  id: string;
  name: string;
  venue_type: string;
  city: string;
  address: string;
  benefit_description: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  photo_url?: string;
  photos?: string[];
}

const PartnerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentUser, logout, colors, activeTheme, t } = useApp();
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updatingVenue, setUpdatingVenue] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeSub, setActiveSub] = useState<any>(null);

  const [venueForm, setVenueForm] = useState({
    name: '',
    description: '',
    benefit: '',
    address: '',
    city: '',
  });

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      const res = await apiRequest<{ venues: VenueData[] }>('/api/partner/my-venue', { requireAuth: true });
      if (res.venues.length > 0) {
        const v = res.venues[0];
        setVenue(v);
        setVenueForm({ name: v.name, description: v.description || '', benefit: v.benefit_description || '', address: v.address || '', city: v.city || '' });

        const [stats, notifs, chatList, agenda] = await Promise.all([
          apiRequest<any>(`/api/partner/venue-stats/${v.id}`, { requireAuth: true }),
          apiRequest<any>('/api/notifications/admin?limit=5', { requireAuth: true }),
          apiRequest<any>('/api/partner/chats', { requireAuth: true }),
          apiRequest<any>('/api/agenda/events', { requireAuth: true }),
        ]);

        setTotalViews(stats.totalViews);
        setWeeklyHistory(stats.weeklyHistory || []);
        setNotifications(notifs.notifications || []);
        setChats(chatList.chats || []);
        setEvents(agenda.events || []);
      }

      const subSnap = await db.collection(COLLECTIONS.SUBSCRIPTIONS)
        .where('user_id', '==', currentUser.id)
        .where('status', '==', 'active')
        .orderBy('current_period_end', 'desc')
        .limit(1)
        .get();

      if (!subSnap.empty) setActiveSub(subSnap.docs[0].data());

    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const handleUpdateVenue = async () => {
    if (!venue) return;
    try {
      setUpdatingVenue(true);
      await apiRequest('/api/partner/venue/update', { method: 'POST', requireAuth: true, body: JSON.stringify({ venueId: venue.id, ...venueForm }) });
      setShowEditModal(false);
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setUpdatingVenue(false); }
  };

  const handleAddPhoto = async () => {
    if (!venue || uploadingPhoto) return;
    if (activeSub?.payment_method === 'TRIAL' && (venue.photos?.length || 0) >= 2) {
      return Alert.alert("Limite de l'essai", "Passez au pack payant pour ajouter plus de photos.");
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (res.canceled || !res.assets?.[0]?.uri) return;

    try {
      setUploadingPhoto(true);
      const asset = res.assets[0];
      const path = `venues/${venue.id}/gallery-${Date.now()}.jpg`;
      await uploadArrayBufferToBucket({ bucket: 'photos', path, uri: asset.uri, contentType: 'image/jpeg' });
      const publicUrl = await getPublicUrl('photos', path);

      const nextPhotos = [...(venue.photos || []), publicUrl];
      await apiRequest('/api/partner/venue/photos', { method: 'POST', requireAuth: true, body: JSON.stringify({ venueId: venue.id, photos: nextPhotos }) });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setUploadingPhoto(false); }
  };

  const handleRemovePhoto = async (url: string) => {
    if (!venue) return;
    try {
      const nextPhotos = (venue.photos || []).filter(p => p !== url);
      await apiRequest('/api/partner/venue/photos', { method: 'POST', requireAuth: true, body: JSON.stringify({ venueId: venue.id, photos: nextPhotos }) });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  };

  const handleCreateEvent = async (form: any) => {
    try {
      if (activeSub?.payment_method === 'TRIAL' && events.length >= 1) {
        return Alert.alert("Limite de l'essai", "La version d'essai est limitée à 1 événement actif.");
      }
      const expiresAt = new Date(Date.now() + parseInt(form.hours) * 3600 * 1000).toISOString();
      await apiRequest('/api/partner/events', { method: 'POST', requireAuth: true, body: JSON.stringify({ ...form, startsAt: new Date().toISOString(), expiresAt }) });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiRequest(`/api/partner/events/${id}`, { method: 'DELETE', requireAuth: true });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const daysLeft = activeSub ? Math.ceil((new Date(activeSub.current_period_end).getTime() - Date.now()) / (1000 * 3600 * 24)) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PartnerHeader
          venueName={venue?.name || ''}
          onOpenPremium={() => navigation.navigate('PartnerPremium')}
          onOpenEdit={() => setShowEditModal(true)}
          onLogout={logout}
          colors={colors}
        />

        {activeSub?.payment_method === 'TRIAL' && (
          <Pressable style={styles.trialBanner} onPress={() => navigation.navigate('PartnerPremium')}>
            <Sparkles size={20} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.trialBannerTitle}>{t('partner_trial_active')}</Text>
              <Text style={styles.trialBannerSub}>{t('partner_trial_expires', { days: daysLeft })}</Text>
            </View>
            <ChevronRight size={20} color="#b45309" />
          </Pressable>
        )}

        <VenueGallery
          photos={venue?.photos || []}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          uploading={uploadingPhoto}
          colors={colors}
        />

        <VenueStatusCard status={venue?.status || 'PENDING'} colors={colors} />

        <PartnerEventManager
          events={events}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
          colors={colors}
        />

        <PartnerChatList
          chats={chats}
          onOpenChat={(c) => navigation.navigate('Chat', { venueChatId: c.id, userId: c.profiles.id, venueName: venue?.name, venuePhoto: venue?.photo_url })}
          colors={colors}
        />

        <VenueAnalytics totalViews={totalViews} weeklyHistory={weeklyHistory} colors={colors} />

        <View style={[styles.tipBox, activeTheme === 'dark' && { backgroundColor: '#451a03', borderColor: '#78350f' }]}>
          <Text style={[styles.tipTitle, activeTheme === 'dark' && { color: '#fbbf24' }]}>💡 Conseil Galant</Text>
          <Text style={[styles.tipText, activeTheme === 'dark' && { color: '#fcd34d' }]}>Proposez un avantage unique pour attirer plus de couples.</Text>
        </View>

        {notifications.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications Récentes</Text>
            <View style={styles.notifList}>
              {notifications.map((notif) => (
                <View key={notif.id} style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.notifIconWrap}><Bell size={16} color={COLORS.primary} /></View>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, { color: colors.text }]}>{notif.metadata.title}</Text>
                    <Text style={[styles.notifMessage, { color: colors.textMuted }]}>{notif.metadata.message}</Text>
                    <Text style={[styles.notifDate, { color: colors.textMuted }]}>{new Date(notif.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <VenueEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        form={venueForm}
        setForm={setVenueForm}
        onSave={handleUpdateVenue}
        loading={updatingVenue}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  trialBanner: { backgroundColor: '#fffbeb', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#fef3c7', marginBottom: 8 },
  trialBannerTitle: { fontSize: 15, fontFamily: 'InterBold', color: '#b45309' },
  trialBannerSub: { fontSize: 12, fontFamily: 'InterSemiBold', color: '#d97706', marginTop: 2 },
  tipBox: { borderRadius: 20, padding: 16, borderWidth: 1 },
  tipTitle: { fontSize: 14, fontWeight: '800', color: '#b45309', marginBottom: 4 },
  tipText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
  notifList: { gap: 10 },
  notifCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  notifIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 14, fontWeight: '800' },
  notifMessage: { fontSize: 13, lineHeight: 18 },
  notifDate: { fontSize: 11, marginTop: 4 },
});

export default PartnerDashboardScreen;
