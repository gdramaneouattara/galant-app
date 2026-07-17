import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, FlatList, Image, ActivityIndicator } from 'react-native';
import { MapPin, X, Utensils, Coffee, TreePine, Flower2, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../data/mock';
import { apiRequest } from '../lib/api';

interface Venue {
  id: string;
  name: string;
  venue_type: 'RESTAURANT' | 'CAFE' | 'PARK' | 'FLORIST' | 'OTHER';
  city: string;
  description: string;
  address: string;
  benefit_description: string;
  photo_url: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (venue: Venue) => void;
  city?: string;
}

const VenueIcon = ({ type, size = 20, color = COLORS.primary }: { type: string, size?: number, color?: string }) => {
  switch (type) {
    case 'RESTAURANT': return <Utensils size={size} color={color} />;
    case 'CAFE': return <Coffee size={size} color={color} />;
    case 'PARK': return <TreePine size={size} color={color} />;
    case 'FLORIST': return <Flower2 size={size} color={color} />;
    default: return <MapPin size={size} color={color} />;
  }
};

const VenueSelectionModal: React.FC<Props> = ({ visible, onClose, onSelect, city }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      void fetchVenues();
    }
  }, [visible, city]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ venues: Venue[] }>(`/api/venues?city=${city || ''}`, { requireAuth: true });
      setVenues(res.venues);
    } catch (e) {
      console.error('Error fetching venues', e);
    } finally {
      setLoading(false);
    }
  };

  const renderVenue = ({ item }: { item: Venue }) => (
    <Pressable style={styles.venueCard} onPress={() => onSelect(item)}>
      <Image source={{ uri: item.photo_url || 'https://placehold.co/100x100' }} style={styles.venueImage} />
      <View style={styles.venueInfo}>
        <View style={styles.venueHeader}>
          <VenueIcon type={item.venue_type} size={16} />
          <Text style={styles.venueName}>{item.name}</Text>
        </View>
        <Text style={styles.venueAddress} numberOfLines={1}>{item.address}</Text>
        <View style={styles.benefitBadge}>
          <Text style={styles.benefitText}>🎁 {item.benefit_description}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={COLORS.muted} />
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Guide Galant</Text>
              <Text style={styles.subtitle}>Lieux recommandés à {city || 'proximité'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X color={COLORS.muted} size={24} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : venues.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucun lieu partenaire trouvé dans cette ville.</Text>
            </View>
          ) : (
            <FlatList
              data={venues}
              renderItem={renderVenue}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  subtitle: { fontSize: 14, color: COLORS.muted },
  closeBtn: { padding: 4 },
  list: { gap: 16, paddingBottom: 40 },
  venueCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 20, padding: 12, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  venueImage: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#e2e8f0' },
  venueInfo: { flex: 1, gap: 4 },
  venueHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  venueName: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  venueAddress: { fontSize: 12, color: COLORS.muted },
  benefitBadge: { backgroundColor: '#fff1f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 4 },
  benefitText: { fontSize: 11, fontWeight: '800', color: '#e11d48' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.muted, textAlign: 'center', fontSize: 15 },
});

export default VenueSelectionModal;
