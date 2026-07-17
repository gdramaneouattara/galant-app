import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { X, CreditCard, Play } from 'lucide-react-native';
import { COLORS } from '../data/mock';
import { useApp } from '../state/AppContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchasePaystack: () => void;
  onPurchaseGoogle: () => void;
  loading?: boolean;
}

const GOLDEN_ROSE_PRICE = parseInt(process.env.EXPO_PUBLIC_GOLDEN_ROSE_AMOUNT || '2500');

const GoldenRosePurchaseModal: React.FC<Props> = ({
  visible,
  onClose,
  onPurchasePaystack,
  onPurchaseGoogle,
  loading
}) => {
  const { t } = useApp();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Pressable style={styles.close} onPress={onClose} disabled={loading}>
            <X color={COLORS.muted} size={24} />
          </Pressable>

          <View style={styles.iconWrap}><Text style={{ fontSize: 40 }}>🌹✨</Text></View>

          <Text style={styles.title}>{t('golden_rose_title')}</Text>
          <Text style={styles.description}>
            {t('golden_rose_desc', { hours: 3 })}
          </Text>

          <View style={styles.priceTag}>
            <Text style={styles.price}>{GOLDEN_ROSE_PRICE} F CFA</Text>
            <Text style={styles.unit}>{t('session_of_glory')}</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Pressable style={[styles.btn, styles.paystackBtn]} onPress={onPurchasePaystack} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <><CreditCard color="#fff" size={20} /><Text style={styles.btnText}>Mobile Money</Text></>
              )}
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable style={[styles.btn, styles.googleBtn]} onPress={onPurchaseGoogle} disabled={loading}>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 25 },
  content: { backgroundColor: '#fff', borderRadius: 32, padding: 24, alignItems: 'center', gap: 16 },
  close: { alignSelf: 'flex-end', marginBottom: -10 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fbbf24' },
  title: { fontSize: 26, fontWeight: '900', color: '#b45309', textAlign: 'center' },
  description: { textAlign: 'center', color: COLORS.muted, lineHeight: 22, fontSize: 15 },
  priceTag: { backgroundColor: '#fffbeb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#fef3c7' },
  price: { fontSize: 24, fontWeight: '900', color: '#d97706' },
  unit: { fontSize: 11, fontWeight: '700', color: '#d97706', textTransform: 'uppercase' },
  buttonGroup: { width: '100%', gap: 12, marginTop: 8 },
  btn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { padding: 8 },
  secondaryBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
});

export default GoldenRosePurchaseModal;
