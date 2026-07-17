import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface VenueEditModalProps {
  visible: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onSave: () => void;
  loading: boolean;
  colors: any;
}

const VenueEditModal: React.FC<VenueEditModalProps> = ({
  visible,
  onClose,
  form,
  setForm,
  onSave,
  loading,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Modifier mon établissement</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.eventForm}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Nom du lieu</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text }]}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Avantage Galant 🎁</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text }]}
              placeholder="Ex: Un cocktail offert..."
              value={form.benefit}
              onChangeText={(v) => setForm({ ...form, benefit: v })}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.input, color: colors.text }]}
              multiline
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Adresse</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text }]}
              value={form.address}
              onChangeText={(v) => setForm({ ...form, address: v })}
            />

            <Pressable style={styles.publishBtn} onPress={onSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Enregistrer les modifications</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  eventForm: { gap: 16 },
  inputLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  textInput: { borderRadius: 16, padding: 14, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  publishBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  publishBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default VenueEditModal;
