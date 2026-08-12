import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CreditCard, LayoutGrid, Play, X } from 'lucide-react-native';
import { COLORS } from '../data/mock';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchasePaystack: () => void;
  onPurchaseGoogle?: () => void;
  loading?: boolean;
}

const GRID_UNLOCK_PRICE = parseInt(process.env.EXPO_PUBLIC_DISCOVER_GRID_UNLOCK_AMOUNT || '1000', 10);

const DiscoverGridPurchaseModal: React.FC<Props> = ({
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
            <LayoutGrid color="#fff" size={40} />
          </View>

          <Text style={styles.title}>Acces Galerie</Text>
          <Text style={styles.description}>
            Parcourez les profils en grille avec une vue rapide et elegante.
          </Text>

          <View style={styles.priceTag}>
            <Text style={styles.price}>{GRID_UNLOCK_PRICE} F CFA</Text>
            <Text style={styles.unit}>deblocage ponctuel</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Pressable style={[styles.btn, styles.paystackBtn]} onPress={onPurchasePaystack} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <CreditCard color="#fff" size={20} />
                  <Text style={styles.btnText}>Carte ou Mobile Money</Text>
                </>
              )}
            </Pressable>

            {!!onPurchaseGoogle && (
              <Pressable style={[styles.btn, styles.googleBtn]} onPress={onPurchaseGoogle} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Play color="#fff" size={20} fill="#fff" />
                    <Text style={styles.btnText}>Carte bancaire</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          <Pressable style={styles.secondaryBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.secondaryBtnText}>Pas maintenant</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 30 },
  content: { backgroundColor: '#fff', borderRadius: 32, padding: 24, alignItems: 'center', gap: 16 },
  close: { alignSelf: 'flex-end', marginBottom: -10 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  description: { textAlign: 'center', color: COLORS.muted, lineHeight: 20, fontSize: 15 },
  priceTag: { backgroundColor: '#eef2ff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, alignItems: 'center' },
  price: { fontSize: 20, fontWeight: '900', color: '#4f46e5' },
  unit: { fontSize: 10, fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase' },
  buttonGroup: { width: '100%', gap: 10, marginTop: 8 },
  btn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { padding: 8 },
  secondaryBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
});

export default DiscoverGridPurchaseModal;
