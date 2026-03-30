import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Plus, Users, ShieldCheck, X, Image as ImageIcon } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import PrimaryButton from '../../components/PrimaryButton';

interface Community {
  id: string;
  name: string;
  description: string;
  cover_photo: string;
  member_count: number;
  creator_id: string;
}

const CommunityScreen: React.FC = () => {
  const { currentUser } = useApp();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowGoalModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    cover_photo: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1000',
  });

  // Éligibilité : Plan BIANNUAL ou ANNUAL requis
  const isEligible =
    currentUser?.subscription_plan_id === 'BIANNUAL' ||
    currentUser?.subscription_plan_id === 'ANNUAL';

  const fetchCommunities = async () => {
    try {
      const data = await apiRequest<Community[]>('/api/communities', { requireAuth: true });
      setCommunities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.description) {
      Alert.alert('Champs requis', 'Donne un nom et une description à ta communauté.');
      return;
    }

    setCreating(true);
    try {
      await apiRequest('/api/communities/create', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify(form),
      });
      Alert.alert('Succès', 'Ta communauté a été créée !');
      setShowGoalModal(false);
      setForm({ name: '', description: '', cover_photo: form.cover_photo });
      fetchCommunities();
    } catch (error: any) {
      Alert.alert('Erreur', "Tu n'as pas l'abonnement requis pour créer une communauté.");
    } finally {
      setCreating(false);
    }
  };

  const renderCommunity = ({ item }: { item: Community }) => (
    <Pressable style={styles.card}>
      <Image source={{ uri: item.cover_photo }} style={styles.cover} />
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.meta}>
          <Users size={14} color={COLORS.muted} />
          <Text style={styles.memberCount}>{item.member_count} membres</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Communautés</Text>
        <Pressable
          style={[styles.createBtn, !isEligible && styles.createBtnLocked]}
          onPress={() => isEligible ? setShowGoalModal(true) : Alert.alert('Premium requis', 'La création de communauté est réservée aux abonnés 6 mois et 1 an.')}
        >
          <Plus color="#fff" size={20} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={communities}
          renderItem={renderCommunity}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>Aucune communauté pour le moment.</Text>
            </View>
          }
        />
      )}

      {/* Modal Création */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer une communauté</Text>
              <Pressable onPress={() => setShowGoalModal(false)}><X size={24} color={COLORS.ink} /></Pressable>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Nom de la communauté</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm({...form, name: t})}
                placeholder="Ex: Passion Voyage"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                value={form.description}
                onChangeText={(t) => setForm({...form, description: t})}
                placeholder="Parle-nous de l'ambiance..."
              />

              <View style={styles.infoBox}>
                <ShieldCheck size={16} color="#059669" />
                <Text style={styles.infoText}>En tant que créateur, tu es responsable de l'animation et de la modération.</Text>
              </View>

              <PrimaryButton
                label={creating ? "Création..." : "Lancer la communauté"}
                onPress={handleCreate}
                disabled={creating}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.ink },
  createBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  createBtnLocked: { backgroundColor: '#cbd5e1' },
  list: { padding: 20, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  cover: { width: '100%', height: 120 },
  cardInfo: { padding: 16, gap: 6 },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  desc: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  memberCount: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyText: { color: COLORS.muted, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.ink },
  form: { gap: 16 },
  label: { fontSize: 12, fontWeight: '800', color: COLORS.ink, textTransform: 'uppercase' },
  input: { backgroundColor: '#f1f5f9', borderRadius: 16, padding: 16, fontSize: 16, color: COLORS.ink },
  textArea: { height: 100, textAlignVertical: 'top' },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 12, color: '#065f46', fontWeight: '600' }
});

export default CommunityScreen;
