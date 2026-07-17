import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { MessageCircle, X, CreditCard, Play } from 'lucide-react-native';
import { COLORS } from '../data/mock';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPurchasePaystack: () => void;
  onPurchaseGoogle?: () => void;
  loading?: boolean;
  userName?: string;
}

const DM_PRICE = parseInt(process.env.EXPO_PUBLIC_DIRECT_MESSAGE_AMOUNT || '500');

const DirectMessagePurchaseModal: React.FC<Props> = ({
  visible,
  onClose,
  onPurchasePaystack,
  onPurchaseGoogle,
  loading,
  userName
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Pressable style={styles.close} onPress={onClose} disabled={loading}>
            <X color={COLORS.muted} size={24} />
          </Pressable>

          <View style={styles.iconWrap}>
            <MessageCircle color="#fff" size={40} fill="#fff" />
          </View>

          <Text style={styles.title}>Message Direct</Text>
          <Text style={styles.description}>
            Brisez la glace ! Envoyez un message à <Text style={styles.highlight}>{userName || 'cet utilisateur'}</Text> sans attendre un match.
          </Text>

          <View style={styles.priceTag}>
            <Text style={styles.price}>{DM_PRICE} F CFA</Text>
            <Text style={styles.unit}>par profil débloqué</Text>
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

            {Platform.OS !== 'web' && !!onPurchaseGoogle && (
              <Pressable style={[styles.btn, styles.googleBtn]} onPress={onPurchaseGoogle} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Play color="#fff" size={20} fill="#fff" />
                    <Text style={styles.btnText}>
                      {'Carte bancaire'}
                    </Text>
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
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  description: { textAlign: 'center', color: COLORS.muted, lineHeight: 20, fontSize: 15 },
  highlight: { color: COLORS.primary, fontWeight: 'bold' },
  priceTag: { backgroundColor: '#fef2f2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, alignItems: 'center' },
  price: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  unit: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  buttonGroup: { width: '100%', gap: 10, marginTop: 8 },
  btn: { width: '100%', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { padding: 8 },
  secondaryBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
});

export default DirectMessagePurchaseModal;
