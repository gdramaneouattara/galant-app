import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { X, CreditCard, Play, Film } from 'lucide-react-native';
import { COLORS } from '../data/mock';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchasePaystack: () => void;
  onPurchaseGoogle: () => void;
  loading?: boolean;
}

const StoryPurchaseModal: React.FC<Props> = ({
  visible,
  onClose,
  onPurchasePaystack,
  onPurchaseGoogle,
  loading,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Pressable style={styles.close} onPress={onClose} disabled={loading}>
            <X color={COLORS.muted} size={24} />
          </Pressable>

          <View style={styles.iconWrap}>
            <Film size={32} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Partager un moment</Text>
          <Text style={styles.description}>
            Publiez une story visible pendant 24h par toute la communauté Galant.
          </Text>

          <View style={styles.priceTag}>
            <Text style={styles.price}>500 F CFA</Text>
            <Text style={styles.unit}>par story</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Pressable style={[styles.btn, styles.paystackBtn]} onPress={onPurchasePaystack} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <CreditCard color="#fff" size={20} />
                  <Text style={styles.btnText}>Mobile Money</Text>
                </>
              )}
            </Pressable>

            {Platform.OS !== 'web' && (
              <Pressable style={[styles.btn, styles.googleBtn]} onPress={onPurchaseGoogle} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Play color="#fff" size={20} fill="#fff" />
                    <Text style={styles.btnText}>{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          <Pressable style={styles.secondaryBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.secondaryBtnText}>Peut-être plus tard</Text>
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
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  description: { textAlign: 'center', color: COLORS.muted, lineHeight: 20, fontSize: 14 },
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

export default StoryPurchaseModal;
