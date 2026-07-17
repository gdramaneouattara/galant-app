import React from 'react';
import { View, Text, Modal, Pressable, Image, StyleSheet } from 'react-native';
import { X, Heart } from 'lucide-react-native';
import VideoPlayer from '../../../components/VideoPlayer';

interface Status {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  created_at: string;
  likes_count?: number;
  liked_by_me?: boolean;
  profiles: {
    id?: string;
    name: string;
    photos: string[];
  };
}

interface StatusViewerModalProps {
  visible: boolean;
  status: Status | null;
  onClose: () => void;
  onToggleLike: (status: Status) => void;
  onOpenLikers: (status: Status) => void;
  likeLoading: boolean;
  isCurrentUser: boolean;
  resolvedUrl: string;
  formattedDate: string;
}

const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  visible,
  status,
  onClose,
  onToggleLike,
  onOpenLikers,
  likeLoading,
  isCurrentUser,
  resolvedUrl,
  formattedDate,
}) => {
  if (!status) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modal}>
        <Pressable style={styles.closeModal} onPress={onClose}>
          <X color="#fff" size={32} />
        </Pressable>
        {status.message_type === 'VIDEO' ? (
          <VideoPlayer uri={resolvedUrl} style={styles.fullMedia} />
        ) : (
          <Image source={{ uri: resolvedUrl }} style={styles.fullMedia} resizeMode="contain" />
        )}
        <View style={styles.modalMeta}>
          <Text style={styles.modalMetaName}>{status.profiles.name}</Text>
          <Text style={styles.modalMetaDate}>{formattedDate}</Text>
          <View style={styles.modalActionsRow}>
            <Pressable
              style={[styles.modalLikeAction, status.liked_by_me ? styles.modalLikeActionActive : null]}
              disabled={likeLoading || isCurrentUser}
              onPress={() => onToggleLike(status)}
            >
              <Heart
                size={16}
                color={status.liked_by_me ? '#22c55e' : '#ef4444'}
                fill={status.liked_by_me ? '#22c55e' : 'transparent'}
              />
              <Text style={styles.modalLikeActionText}>{Number(status.likes_count || 0)}</Text>
            </Pressable>
            {isCurrentUser && (
              <Pressable style={styles.modalLikersButton} onPress={() => onOpenLikers(status)}>
                <Text style={styles.modalLikersButtonText}>Voir les likes</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullMedia: { width: '100%', height: '80%' },
  modalMeta: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  modalMetaName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalMetaDate: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginTop: 2 },
  modalActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalLikeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalLikeActionActive: {
    backgroundColor: 'rgba(220,252,231,0.95)',
  },
  modalLikeActionText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  modalLikersButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalLikersButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default StatusViewerModal;
