import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Plus, Trash2, Zap, Calendar, X } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface VenueEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'EVENT' | 'FLASH_OFFER';
  starts_at: string;
  expires_at: string;
}

interface PartnerEventManagerProps {
  events: VenueEvent[];
  onCreateEvent: (data: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  colors: any;
}

const PartnerEventManager: React.FC<PartnerEventManagerProps> = ({
  events,
  onCreateEvent,
  onDeleteEvent,
  colors,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: 'EVENT' as 'EVENT' | 'FLASH_OFFER',
    hours: '2',
  });

  const handleCreate = async () => {
    setLoading(true);
    await onCreateEvent(form);
    setLoading(false);
    setShowModal(false);
    setForm({ title: '', description: '', eventType: 'EVENT', hours: '2' });
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes Événements & Offres</Text>
        <Pressable style={styles.addEventBtn} onPress={() => setShowModal(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addEventBtnText}>Publier</Text>
        </Pressable>
      </View>

      {events.length === 0 ? (
        <View style={[styles.emptyEvents, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Text style={[styles.emptyEventsText, { color: colors.textMuted }]}>
            Faites bouger votre établissement ! Publiez un événement ou une offre flash.
          </Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {events.map((ev) => (
            <View key={ev.id} style={[styles.eventSmallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.eventSmallInfo}>
                <View style={styles.typeRowSmall}>
                  {ev.event_type === 'FLASH_OFFER' ? (
                    <Zap size={10} color="#e11d48" fill="#e11d48" />
                  ) : (
                    <Calendar size={10} color="#3b82f6" />
                  )}
                  <Text style={[styles.typeLabelSmall, { color: ev.event_type === 'FLASH_OFFER' ? '#e11d48' : '#3b82f6' }]}>
                    {ev.event_type === 'FLASH_OFFER' ? 'Offre Flash' : 'Événement'}
                  </Text>
                </View>
                <Text style={[styles.eventSmallTitle, { color: colors.text }]} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={[styles.eventSmallTime, { color: colors.textMuted }]}>
                  Expire le {new Date(ev.expires_at).toLocaleDateString()}
                </Text>
              </View>
              <Pressable onPress={() => onDeleteEvent(ev.id)} style={styles.deleteEventBtn}>
                <Trash2 size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Publier une offre</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.eventForm}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Type d'annonce</Text>
              <View style={styles.eventTypeRow}>
                <Pressable
                  style={[styles.eventTypeBtn, form.eventType === 'EVENT' && styles.eventTypeBtnActive]}
                  onPress={() => setForm({ ...form, eventType: 'EVENT' })}
                >
                  <Calendar size={18} color={form.eventType === 'EVENT' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.eventTypeText, form.eventType === 'EVENT' && styles.eventTypeTextActive]}>Événement</Text>
                </Pressable>
                <Pressable
                  style={[styles.eventTypeBtn, form.eventType === 'FLASH_OFFER' && styles.eventTypeBtnActive]}
                  onPress={() => setForm({ ...form, eventType: 'FLASH_OFFER' })}
                >
                  <Zap size={18} color={form.eventType === 'FLASH_OFFER' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.eventTypeText, form.eventType === 'FLASH_OFFER' && styles.eventTypeTextActive]}>Offre Flash</Text>
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Titre</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.input, color: colors.text }]}
                placeholder="Ex: Soirée Jazz Live"
                value={form.title}
                onChangeText={(v) => setForm({ ...form, title: v })}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Durée (heures)</Text>
              <View style={styles.hoursRow}>
                {['1', '2', '4', '8', '24'].map((h) => (
                  <Pressable
                    key={h}
                    style={[styles.hourBtn, form.hours === h && styles.hourBtnActive]}
                    onPress={() => setForm({ ...form, hours: h })}
                  >
                    <Text style={[styles.hourBtnText, form.hours === h && styles.hourBtnTextActive]}>{h}h</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.publishBtn} onPress={handleCreate} disabled={loading || !form.title}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Publier maintenant</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  addEventBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  addEventBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyEvents: { padding: 20, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1 },
  emptyEventsText: { textAlign: 'center', fontSize: 13, lineHeight: 18 },
  eventList: { gap: 10 },
  eventSmallCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 12 },
  eventSmallInfo: { flex: 1, gap: 2 },
  typeRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeLabelSmall: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  eventSmallTitle: { fontSize: 14, fontWeight: '800' },
  eventSmallTime: { fontSize: 11 },
  deleteEventBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  eventForm: { gap: 16 },
  inputLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  eventTypeRow: { flexDirection: 'row', gap: 10 },
  eventTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  eventTypeBtnActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  eventTypeText: { fontSize: 13, fontWeight: '700' },
  eventTypeTextActive: { color: '#fff' },
  textInput: { borderRadius: 16, padding: 14, fontSize: 16 },
  hoursRow: { flexDirection: 'row', gap: 10 },
  hourBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', borderColor: '#e2e8f0' },
  hourBtnActive: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  hourBtnText: { fontSize: 14, fontWeight: '700' },
  hourBtnTextActive: { color: '#e11d48' },
  publishBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  publishBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default PartnerEventManager;
