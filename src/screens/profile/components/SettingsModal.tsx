import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { X, Sun, Moon, Monitor, Languages, Download, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';
import PrimaryButton from '../../../components/PrimaryButton';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  themePreference: string;
  onSetTheme: (theme: any) => void;
  language: string;
  onSetLanguage: (lang: any) => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
  exportingData?: boolean;
  deletingAccount?: boolean;
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
  onExportData,
  onDeleteAccount,
  exportingData = false,
  deletingAccount = false,
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
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

          <Text style={[styles.label, { color: colors.text, marginTop: 20, marginBottom: 15 }]}>Confidentialite & donnees</Text>
          <View style={styles.privacyActions}>
            <Pressable
              style={[styles.privacyRow, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={onExportData}
              disabled={exportingData}
            >
              <View style={[styles.privacyIcon, { backgroundColor: colors.card }]}>
                <Download size={20} color="#0369a1" />
              </View>
              <Text style={[styles.privacyLabel, { color: colors.text }]}>
                {exportingData ? '...' : t('download_my_data')}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.privacyRow, styles.deleteRow]}
              onPress={onDeleteAccount}
              disabled={deletingAccount}
            >
              <View style={styles.deleteIcon}>
                <Trash2 size={20} color="#b91c1c" />
              </View>
              <Text style={[styles.privacyLabel, styles.deleteLabel]}>
                {deletingAccount ? '...' : t('delete_my_account')}
              </Text>
            </Pressable>
          </View>

          <PrimaryButton label={language === 'fr' ? 'Fermer' : 'Close'} onPress={onClose} />
          </ScrollView>
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
    maxHeight: '88%',
  },
  modalBody: {
    paddingBottom: 4,
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
  privacyActions: {
    gap: 10,
    marginBottom: 10,
  },
  privacyRow: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  deleteRow: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  deleteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    color: '#b91c1c',
  },
});

export default SettingsModal;
