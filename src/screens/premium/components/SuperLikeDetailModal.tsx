import React from 'react';
import { View, Text, Modal, Pressable, Image, StyleSheet, ScrollView } from 'react-native';
import { X, Heart, Check } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

type SuperLikeStatus = 'PENDING' | 'ACCEPTED' | 'IGNORED';

interface SuperLikeRow {
  id: string;
  status: SuperLikeStatus;
  user: {
    id: string;
    name: string;
    age: number;
    photos: string[];
    city: string | null;
    country: string | null;
    relationship_goal: string | null;
    bio: string;
    interests: string[];
  };
}

interface SuperLikeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSuperLike: any;
  onLike: (row: any) => void;
  onRespond: (row: any, action: 'ACCEPT' | 'IGNORE') => void;
  onShowSuperLikePurchase: () => void;
  isLiked: boolean;
  isSuperLiked: boolean;
  isLiking: boolean;
  isResponding: boolean;
  isSuperLiking: boolean;
}

const SuperLikeDetailModal: React.FC<SuperLikeDetailModalProps> = ({
  visible,
  onClose,
  selectedSuperLike,
  onLike,
  onRespond,
  onShowSuperLikePurchase,
  isLiked,
  isSuperLiked,
  isLiking,
  isResponding,
  isSuperLiking,
}) => {
  if (!selectedSuperLike) return null;

  const renderStatusPill = (status: SuperLikeStatus) => {
    if (status === 'ACCEPTED') {
      return (
        <View style={[styles.statusPill, styles.statusPillAccepted]}>
          <Text style={[styles.statusPillText, styles.statusPillTextAccepted]}>Accepté</Text>
        </View>
      );
    }
    if (status === 'IGNORED') {
      return (
        <View style={[styles.statusPill, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.statusPillText, { color: '#64748b' }]}>Ignoré</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusPill, styles.statusPillPending]}>
        <Text style={[styles.statusPillText, styles.statusPillTextPending]}>En attente</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Pressable style={styles.modalClose} onPress={onClose}>
            <X size={18} color="#64748b" />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Image
              source={{
                uri: selectedSuperLike.user.photos?.[0] || 'https://placehold.co/800x1000',
              }}
              style={styles.modalPhoto}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalName}>
                {selectedSuperLike.user.name}, {selectedSuperLike.user.age}
              </Text>
              {renderStatusPill(selectedSuperLike.status)}
            </View>
            <Text style={styles.modalMeta}>
              {selectedSuperLike.user.city || 'Ville non renseignée'}
              {selectedSuperLike.user.country ? `, ${selectedSuperLike.user.country}` : ''}
            </Text>
            {selectedSuperLike.user.relationship_goal && (
              <Text style={styles.modalGoal}>{selectedSuperLike.user.relationship_goal}</Text>
            )}
            {selectedSuperLike.user.bio && (
              <Text style={styles.modalBio}>{selectedSuperLike.user.bio}</Text>
            )}
            <View style={styles.tags}>
              {(selectedSuperLike.user.interests || []).slice(0, 6).map((interest: string) => (
                <Text key={interest} style={styles.tag}>{interest}</Text>
              ))}
            </View>
            <Text style={styles.modalHint}>
              Vous pouvez liker en retour ou envoyer un bouquet de roses payant pour augmenter les chances de match.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.likeButton,
                  isLiked && styles.likeButtonDone,
                  isLiking && styles.buttonDisabled,
                ]}
                onPress={() => onLike(selectedSuperLike)}
                disabled={isLiked || isLiking}
              >
                <Heart size={18} color="#fff" fill="#fff" />
              </Pressable>
              <Pressable
                style={[
                  styles.superLikePaidButton,
                  isSuperLiked && styles.superLikePaidButtonDone,
                  isSuperLiking && styles.buttonDisabled,
                ]}
                onPress={onShowSuperLikePurchase}
                disabled={isSuperLiked || isSuperLiking}
              >
                <Text style={{ fontSize: 16 }}>🌹</Text>
              </Pressable>
              {selectedSuperLike.status === 'PENDING' && (
                <>
                  <Pressable
                    style={[styles.primaryButton, isResponding && styles.buttonDisabled]}
                    onPress={() => onRespond(selectedSuperLike, 'ACCEPT')}
                    disabled={isResponding}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>Accepter</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.ghostDangerButton, isResponding && styles.buttonDisabled]}
                    onPress={() => onRespond(selectedSuperLike, 'IGNORE')}
                    disabled={isResponding}
                  >
                    <Text style={styles.ghostDangerButtonText}>Ignorer</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.72)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12, maxHeight: '90%' },
  modalClose: { alignSelf: 'flex-end', width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  modalPhoto: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14, backgroundColor: '#e2e8f0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 },
  modalName: { flex: 1, fontSize: 22, fontWeight: '900', color: COLORS.ink },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillPending: { backgroundColor: '#fef3c7' },
  statusPillAccepted: { backgroundColor: '#dcfce7' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextPending: { color: '#b45309' },
  statusPillTextAccepted: { color: '#15803d' },
  modalMeta: { color: COLORS.muted, fontSize: 13 },
  modalGoal: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', overflow: 'hidden', marginTop: 8 },
  modalBio: { color: COLORS.ink, lineHeight: 20, marginTop: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#f1f5f9', color: '#334155', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  modalHint: { color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  likeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  likeButtonDone: { backgroundColor: '#16a34a' },
  superLikePaidButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  superLikePaidButtonDone: { backgroundColor: '#16a34a' },
  primaryButton: { flex: 1, borderRadius: 10, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  ghostDangerButton: { borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff5f5', paddingHorizontal: 12, paddingVertical: 10 },
  ghostDangerButtonText: { color: '#b91c1c', fontWeight: '800', fontSize: 13 },
  buttonDisabled: { opacity: 0.6 },
});

export default SuperLikeDetailModal;
