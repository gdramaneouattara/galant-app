import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { Check, X, MapPin, ExternalLink } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';

interface Venue {
  id: string;
  name: string;
  venue_type: string;
  city: string;
  address: string;
  benefit_description: string;
  status: string;
  profiles: {
    email: string;
  };
}

const AdminVenueModerationScreen: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingVenues = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ venues: Venue[] }>('/api/admin/venues/pending', { requireAuth: true });
      setVenues(res.venues);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVenues();
  }, []);

  const handleDecision = async (id: string, action: 'approve' | 'reject') => {
    try {
      await apiRequest(`/api/admin/venues/${id}/${action}`, { method: 'POST', requireAuth: true });
      setVenues(prev => prev.filter(v => v.id !== id));
      Alert.alert('Succès', `L'établissement a été ${action === 'approve' ? 'approuvé' : 'refusé'}.`);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const renderVenue = ({ item }: { item: Venue }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.venue_type}</Text>
        </View>
        <Text style={styles.email}>{item.profiles?.email}</Text>
      </View>

      <Text style={styles.name}>{item.name}</Text>

      <View style={styles.infoRow}>
        <MapPin size={14} color={COLORS.muted} />
        <Text style={styles.infoText}>{item.city}, {item.address}</Text>
      </View>

      <View style={styles.benefitBox}>
        <Text style={styles.benefitTitle}>Avantage proposé :</Text>
        <Text style={styles.benefitText}>{item.benefit_description}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, styles.approveBtn]}
          onPress={() => handleDecision(item.id, 'approve')}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.btnText}>Approuver</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.rejectBtn]}
          onPress={() => handleDecision(item.id, 'reject')}
        >
          <X size={20} color="#fff" />
          <Text style={styles.btnText}>Refuser</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modération des Lieux ({venues.length})</Text>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={venues}
          renderItem={renderVenue}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune demande en attente.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.ink, marginBottom: 20 },
  list: { gap: 16, paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '800', color: '#1d4ed8' },
  email: { fontSize: 12, color: COLORS.muted },
  name: { fontSize: 18, fontWeight: '900', color: COLORS.ink, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  infoText: { fontSize: 13, color: COLORS.muted },
  benefitBox: { backgroundColor: '#fff1f2', borderRadius: 12, padding: 12, marginBottom: 16 },
  benefitTitle: { fontSize: 11, fontWeight: '700', color: '#e11d48', textTransform: 'uppercase', marginBottom: 4 },
  benefitText: { fontSize: 14, color: '#9f1239', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: COLORS.muted, fontSize: 16 },
});

export default AdminVenueModerationScreen;
