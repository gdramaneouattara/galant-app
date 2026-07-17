import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
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
    age?: number | null;
    gender?: string | null;
    city?: string | null;
    country?: string | null;
    bio?: string;
    photos: string[];
    interests?: string[];
  };
}

interface LikerProfileModalProps {
  visible: boolean;
  onClose: () => void;
  liker: StatusLiker | null;
  onLikeBack: (liker: StatusLiker) => void;
  onSuperLike: () => void;
  onDirectMessage: () => void;
  likingBackUserId: string | null;
}

const LikerProfileModal: React.FC<LikerProfileModalProps> = ({
  visible,
  onClose,
  liker,
  onLikeBack,
  onSuperLike,
  onDirectMessage,
  likingBackUserId,
}) => {
  if (!liker) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.likerProfileOverlay}>
        <View style={styles.likerProfileCard}>
          <Pressable style={styles.likerProfileClose} onPress={onClose}>
            <X size={18} color={COLORS.ink} />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.likerPhotosRow}>
              {(liker.profile.photos?.length ? liker.profile.photos : ['https://placehold.co/800x1000']).map((uri, idx) => (
                <Image key={`${liker.user_id}-${idx}`} source={{ uri }} style={styles.likerPhotoLarge} />
              ))}
            </ScrollView>
            <Text style={styles.likerProfileName}>
              {liker.profile.name}{typeof liker.profile.age === 'number' ? `, ${liker.profile.age}` : ''}
            </Text>
            <Text style={styles.likerProfileMeta}>
              {[liker.profile.city, liker.profile.country].filter(Boolean).join(', ') || 'Localisation non renseignée'}
            </Text>
            {liker.profile.bio && <Text style={styles.likerProfileBio}>{liker.profile.bio}</Text>}
            <View style={styles.likerInterestsWrap}>
              {(liker.profile.interests || []).slice(0, 10).map((interest) => (
                <Text key={`${liker.user_id}-${interest}`} style={styles.likerInterestTag}>{interest}</Text>
              ))}
            </View>
            <View style={styles.likerProfileActions}>
              <Pressable
                style={[
                  styles.likerHeartBtnLarge,
                  (liker.liked_back || liker.is_matched) && styles.likerHeartBtnDone,
                  likingBackUserId === liker.user_id && styles.likerHeartBtnDisabled,
                ]}
                onPress={() => onLikeBack(liker)}
                disabled={!!liker.liked_back || !!liker.is_matched || likingBackUserId === liker.user_id}
              >
                <Heart size={16} color="#fff" fill="#fff" />
                <Text style={styles.likerHeartBtnLargeText}>
                  {liker.is_matched ? 'Match' : liker.liked_back ? 'Like envoyé' : 'Liker en retour'}
                </Text>
              </Pressable>
              <Pressable style={styles.paidActionBtn} onPress={onSuperLike}>
                <Text style={styles.paidActionBtnText}>Super Like payant</Text>
              </Pressable>
              <Pressable style={styles.paidActionBtn} onPress={onDirectMessage}>
                <Text style={styles.paidActionBtnText}>Message direct payant</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  likerProfileOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 16 },
  likerProfileCard: { maxHeight: '86%', backgroundColor: '#fff', borderRadius: 18, padding: 14 },
  likerProfileClose: { alignSelf: 'flex-end', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', marginBottom: 8 },
  likerPhotosRow: { gap: 10, paddingBottom: 10 },
  likerPhotoLarge: { width: 220, height: 280, borderRadius: 12, backgroundColor: '#e2e8f0' },
  likerProfileName: { color: COLORS.ink, fontSize: 20, fontWeight: '900' },
  likerProfileMeta: { color: COLORS.muted, marginTop: 2, fontWeight: '700' },
  likerProfileBio: { marginTop: 10, color: '#0f172a', lineHeight: 20 },
  likerInterestsWrap: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  likerInterestTag: { backgroundColor: '#f1f5f9', color: '#334155', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  likerProfileActions: { marginTop: 14, flexDirection: 'column', justifyContent: 'flex-start', gap: 8 },
  likerHeartBtnLarge: { minWidth: 160, borderRadius: 999, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  likerHeartBtnLargeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  likerHeartBtnDone: { backgroundColor: '#16a34a' },
  likerHeartBtnDisabled: { opacity: 0.65 },
  paidActionBtn: { borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  paidActionBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
});

export default LikerProfileModal;
