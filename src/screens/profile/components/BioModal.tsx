import React from 'react';
import { View, Text, Modal, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface BioModalProps {
  visible: boolean;
  onClose: () => void;
  tempBio: string;
  setTempBio: (bio: string) => void;
  onSave: () => void;
  onGetAiSuggestion: () => void;
  is_premium: boolean;
  aiLoading: boolean;
  saving: boolean;
  colors: any;
  activeTheme: string;
}

const BioModal: React.FC<BioModalProps> = ({
  visible,
  onClose,
  tempBio,
  setTempBio,
  onSave,
  onGetAiSuggestion,
  is_premium,
  aiLoading,
  saving,
  colors,
  activeTheme,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Ma Biographie Galante</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Décrivez-vous avec élégance</Text>
            </View>
            <Pressable onPress={onClose}>
              <X color={colors.textMuted} size={24} />
            </Pressable>
          </View>

          <View style={[
            styles.aiAssistBox,
            { backgroundColor: activeTheme === 'dark' ? '#4c0519' : '#fff1f2', borderColor: activeTheme === 'dark' ? '#9f1239' : '#fecdd3' }
          ]}>
            <Sparkles size={20} color="#e11d48" />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiAssistTitle}>{is_premium ? "Assistant Rédactionnel" : "Sublimez avec l'IA 💎"}</Text>
              <Text style={[styles.aiAssistSub, { color: activeTheme === 'dark' ? '#fb7185' : '#9f1239' }]}>
                {is_premium ? "Laissez l'IA sublimer votre présentation." : "Les membres Premium ont des bios 3x plus attirantes."}
              </Text>
            </View>
            <Pressable style={styles.aiAssistBtn} onPress={onGetAiSuggestion} disabled={aiLoading}>
              {aiLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.aiAssistBtnText}>{is_premium ? "Sublimer" : "Découvrir"}</Text>}
            </Pressable>
          </View>

          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }
            ]}
            placeholder="Écrivez quelques mots sur vous..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
            value={tempBio}
            onChangeText={setTempBio}
          />

          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },
  aiAssistBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
  },
  aiAssistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
  aiAssistSub: {
    fontSize: 12,
  },
  aiAssistBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiAssistBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default BioModal;
