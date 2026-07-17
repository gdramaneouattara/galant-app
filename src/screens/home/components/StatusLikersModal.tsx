import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { X, Heart } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface StatusLiker {
  user_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
  profile: {
    id: string;
    name: string;
    photos: string[];
    interests?: string[];
    age?: number | null;
  };
}

interface StatusLikersModalProps {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  likers: StatusLiker[];
  onOpenProfile: (liker: StatusLiker) => void;
  onLikeBack: (liker: StatusLiker) => void;
  likingBackUserId: string | null;
  formatDate: (date: string) => string;
}

const StatusLikersModal: React.FC<StatusLikersModalProps> = ({
  visible,
  onClose,
  loading,
  likers,
  onOpenProfile,
  onLikeBack,
  likingBackUserId,
  formatDate,
}) => {
  const renderLikerState = (entry: StatusLiker) => {
    if (entry.is_matched) return <Text style={styles.likerStateMatched}>Match</Text>;
    if (entry.liked_back) return <Text style={styles.likerStateSent}>Like envoyé</Text>;
    return <Text style={styles.likerStatePending}>Nouveau</Text>;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.likersModalOverlay}>
        <View style={styles.likersModalSheet}>
          <View style={styles.likersHeader}>
            <Text style={styles.likersTitle}>Personnes ayant aimé</Text>
            <Pressable onPress={onClose}>
              <X size={20} color={COLORS.ink} />
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.likersLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.likersLoadingText}>Chargement...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.likersList}>
              {likers.length === 0 ? (
                <Text style={styles.likersEmpty}>Aucun like pour le moment.</Text>
              ) : (
                likers.map((entry) => (
                  <View key={`${entry.user_id}-${entry.created_at}`} style={styles.likerRow}>
                    <Image source={{ uri: entry.profile.photos?.[0] || 'https://placehold.co/80x80' }} style={styles.likerAvatar} />
                    <View style={styles.likerTextBlock}>
                      <Text style={styles.likerName}>{entry.profile.name}</Text>
                      <Text style={styles.likerDate}>{formatDate(entry.created_at)}</Text>
                    </View>
                    <View style={styles.likerActions}>
                      {renderLikerState(entry)}
                      <Pressable style={styles.likerOpenBtn} onPress={() => onOpenProfile(entry)}>
                        <Text style={styles.likerOpenBtnText}>Profil</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.likerHeartBtn,
                          (entry.liked_back || entry.is_matched) && styles.likerHeartBtnDone,
                          likingBackUserId === entry.user_id && styles.likerHeartBtnDisabled,
                        ]}
                        onPress={() => onLikeBack(entry)}
                        disabled={!!entry.liked_back || !!entry.is_matched || likingBackUserId === entry.user_id}
                      >
                        <Heart size={15} color="#fff" fill="#fff" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  likersModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  likersModalSheet: { minHeight: '45%', maxHeight: '70%', backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  likersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  likersTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  likersLoading: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  likersLoadingText: { color: COLORS.muted, fontWeight: '700' },
  likersList: { paddingTop: 10, paddingBottom: 20, gap: 10 },
  likersEmpty: { color: COLORS.muted, textAlign: 'center', marginTop: 12, fontWeight: '700' },
  likerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  likerAvatar: { width: 38, height: 38, borderRadius: 19 },
  likerTextBlock: { flex: 1 },
  likerName: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  likerDate: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  likerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  likerStatePending: { color: '#b91c1c', fontSize: 11, fontWeight: '800' },
  likerStateSent: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  likerStateMatched: { color: '#1d4ed8', fontSize: 11, fontWeight: '800' },
  likerOpenBtn: { borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  likerOpenBtnText: { color: '#0f172a', fontSize: 11, fontWeight: '800' },
  likerHeartBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  likerHeartBtnDone: { backgroundColor: '#16a34a' },
  likerHeartBtnDisabled: { opacity: 0.65 },
});

export default StatusLikersModal;
