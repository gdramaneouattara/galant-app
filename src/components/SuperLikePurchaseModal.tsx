import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, TextInput, Alert } from 'react-native';
import { X, CreditCard, Play, Sparkles } from 'lucide-react-native';
import { COLORS } from '../data/mock';
import { useApp } from '../state/AppContext';
import { apiRequest } from '../lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchasePaystack: (note?: string) => void;
  onPurchaseGoogle: (note?: string) => void;
  loading?: boolean;
  userName?: string;
  userInterests?: string[];
}

const SUPER_LIKE_PRICE = parseInt(process.env.EXPO_PUBLIC_SUPER_LIKE_AMOUNT || '500');

const SuperLikePurchaseModal: React.FC<Props> = ({
  visible,
  onClose,
  onPurchasePaystack,
  onPurchaseGoogle,
  loading,
  userName,
  userInterests
}) => {
  const [note, setNote] = useState('');
  const { currentUser, language, t } = useApp();
  const [aiLoading, setAiLoading] = useState(false);

  const getAiSuggestion = async () => {
    if (!currentUser?.isPremium) {
      Alert.alert(
        t('ai_assistant_title'),
        t('ai_assistant_exclusive'),
        [{ text: t('maybe_later'), style: "cancel" }, { text: t('become_premium'), onPress: () => { onClose(); } }]
      );
      return;
    }

    try {
      setAiLoading(true);
      const res = await apiRequest<{ suggestions: string[] }>('/api/ai/writing-assistant', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          type: 'ROSE_NOTE',
          recipientName: userName || 'votre destinataire',
          interests: userInterests || [],
          lang: language
        })
      });
      if (res.suggestions && res.suggestions.length > 0) {
        setNote(res.suggestions[Math.floor(Math.random() * res.suggestions.length)]);
      }
    } catch (e: any) {
      Alert.alert(t('ai_error'), t('ai_error_desc'));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Pressable style={styles.close} onPress={onClose} disabled={loading}>
            <X color={COLORS.muted} size={24} />
          </Pressable>

          <View style={styles.iconWrap}><Text style={{ fontSize: 40 }}>🌹</Text></View>

          <Text style={styles.title}>{t('rose_bouquet')}</Text>
          <Text style={styles.description}>
            {t('send_rose_desc', { name: userName || 'cet utilisateur' })}
          </Text>

          <View style={styles.noteContainer}>
            <View style={styles.noteLabelRow}>
              <Text style={styles.noteLabel}>{t('add_scented_note')}</Text>
              <Pressable style={styles.aiBtn} onPress={getAiSuggestion} disabled={aiLoading}>
                {aiLoading ? <ActivityIndicator size="small" color="#e11d48" /> : (
                  <><Sparkles size={14} color="#e11d48" /><Text style={styles.aiBtnText}>{t('ai_help')}</Text></>
                )}
              </Pressable>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder={t('write_mot_doux')}
              placeholderTextColor={COLORS.muted}
              maxLength={100}
              value={note}
              onChangeText={setNote}
              multiline
              editable={!loading}
            />
          </View>

          <View style={styles.priceTag}>
            <Text style={styles.price}>{SUPER_LIKE_PRICE} F CFA</Text>
            <Text style={styles.unit}>{t('per_bouquet')}</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Pressable style={[styles.btn, styles.paystackBtn]} onPress={() => onPurchasePaystack(note)} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><CreditCard color="#fff" size={20} /><Text style={styles.btnText}>Mobile Money</Text></>
              )}
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable style={[styles.btn, styles.googleBtn]} onPress={() => onPurchaseGoogle(note)} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <><Play color="#fff" size={20} fill="#fff" /><Text style={styles.btnText}>{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text></>
                )}
              </Pressable>
            )}
          </View>
          <Pressable style={styles.secondaryBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.secondaryBtnText}>{t('maybe_later')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 25 },
  content: { backgroundColor: '#fff', borderRadius: 32, padding: 24, alignItems: 'center', gap: 12 },
  close: { alignSelf: 'flex-end', marginBottom: -10 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecdd3' },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  description: { textAlign: 'center', color: COLORS.muted, lineHeight: 20, fontSize: 14 },
  noteContainer: { width: '100%', marginTop: 8 },
  noteLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginLeft: 4 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff1f2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fecdd3' },
  aiBtnText: { fontSize: 11, fontWeight: '800', color: '#e11d48' },
  noteInput: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, fontSize: 14, color: COLORS.ink, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0' },
  priceTag: { backgroundColor: '#fef3c7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  price: { fontSize: 20, fontWeight: '900', color: '#d97706' },
  unit: { fontSize: 10, fontWeight: '700', color: '#d97706', textTransform: 'uppercase' },
  buttonGroup: { width: '100%', gap: 10, marginTop: 8 },
  btn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { padding: 8 },
  secondaryBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
});

export default SuperLikePurchaseModal;
