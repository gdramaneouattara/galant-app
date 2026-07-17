import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { X, Sun, Moon, Monitor, Languages } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';
import PrimaryButton from '../../../components/PrimaryButton';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  themePreference: string;
  onSetTheme: (theme: any) => void;
  language: string;
  onSetLanguage: (lang: any) => void;
  t: (key: any, params?: any) => string;
  colors: any;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  themePreference,
  onSetTheme,
  language,
  onSetLanguage,
  t,
  colors,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Paramètres</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Personnalisez votre expérience</Text>
            </View>
            <Pressable onPress={onClose}>
              <X color={colors.textMuted} size={24} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 10, marginBottom: 15 }]}>Apparence</Text>

          <View style={styles.themeOptions}>
            {[
              { id: 'light', label: 'Clair', icon: Sun },
              { id: 'dark', label: 'Sombre', icon: Moon },
              { id: 'system', label: 'Système', icon: Monitor },
            ].map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.bg, borderColor: colors.border },
                  themePreference === opt.id && { borderColor: COLORS.primary, borderWidth: 2 }
                ]}
                onPress={() => onSetTheme(opt.id)}
              >
                <opt.icon size={24} color={themePreference === opt.id ? COLORS.primary : colors.textMuted} />
                <Text style={[styles.themeOptionLabel, { color: themePreference === opt.id ? COLORS.primary : colors.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 20, marginBottom: 15 }]}>{t('language')}</Text>
          <View style={styles.themeOptions}>
            {[
              { id: 'fr', label: 'Français' },
              { id: 'en', label: 'English' },
            ].map((opt) => (
              <Pressable
                key={opt.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.bg, borderColor: colors.border },
                  language === opt.id && { borderColor: COLORS.primary, borderWidth: 2 }
                ]}
                onPress={() => onSetLanguage(opt.id)}
              >
                <Languages size={24} color={language === opt.id ? COLORS.primary : colors.textMuted} />
                <Text style={[styles.themeOptionLabel, { color: language === opt.id ? COLORS.primary : colors.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <PrimaryButton label={language === 'fr' ? 'Fermer' : 'Close'} onPress={onClose} />
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
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  themeOption: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  themeOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SettingsModal;
