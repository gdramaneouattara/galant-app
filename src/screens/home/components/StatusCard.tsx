import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, Play } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

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

interface StatusCardProps {
  item: Status;
  onPress: (id: string) => void;
  onToggleLike: (status: Status) => void;
  likeLoading: boolean;
  isCurrentUser: boolean;
  resolvedUrl?: string;
  videoPreviewUrl?: string;
  formattedDate: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  item,
  onPress,
  onToggleLike,
  likeLoading,
  isCurrentUser,
  resolvedUrl,
  videoPreviewUrl,
  formattedDate,
}) => {
  return (
    <Pressable style={styles.statusCard} onPress={() => onPress(item.id)}>
      {item.message_type === 'VIDEO' ? (
        videoPreviewUrl ? (
          <Image source={{ uri: videoPreviewUrl }} style={styles.statusPreview} />
        ) : (
          <View style={[styles.statusPreview, styles.videoPreviewFallback]}>
            <Play size={26} color="#fff" fill="#fff" />
          </View>
        )
      ) : (
        <Image source={{ uri: resolvedUrl || item.profiles.photos[0] }} style={styles.statusPreview} />
      )}
      <View style={styles.statusAuthorChip}>
        <Image
          source={{ uri: item.profiles.photos?.[0] || 'https://placehold.co/80x80' }}
          style={styles.statusAuthorAvatar}
        />
      </View>
      <Pressable
        style={[styles.statusLikeButton, item.liked_by_me ? styles.statusLikeButtonActive : null]}
        disabled={likeLoading || isCurrentUser}
        onPress={(event) => {
          event.stopPropagation?.();
          onToggleLike(item);
        }}
      >
        <Heart
          size={13}
          color={item.liked_by_me ? '#22c55e' : '#ef4444'}
          fill={item.liked_by_me ? '#22c55e' : 'transparent'}
        />
        <Text style={styles.statusLikeCount}>{Number(item.likes_count || 0)}</Text>
      </Pressable>
      <View style={styles.statusInfo}>
        <View style={styles.statusMetaText}>
          <Text style={styles.statusName} numberOfLines={1}>{item.profiles.name}</Text>
          <Text style={styles.statusDateTime}>{formattedDate}</Text>
        </View>
        {item.message_type === 'VIDEO' && <Play size={12} color="#fff" fill="#fff" />}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  statusCard: { flex: 1, margin: 5, aspectRatio: 9 / 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  statusPreview: { width: '100%', height: '100%' },
  videoPreviewFallback: { backgroundColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  statusAuthorChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.45)',
    padding: 1,
  },
  statusAuthorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  statusLikeButton: {
    position: 'absolute',
    top: 10,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  statusLikeButtonActive: {
    backgroundColor: 'rgba(220,252,231,0.95)',
  },
  statusLikeCount: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  statusInfo: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  statusMetaText: { flex: 1, paddingRight: 8 },
  statusName: { color: '#fff', fontSize: 12, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  statusDateTime: { color: '#f8fafc', fontSize: 10, fontWeight: '700', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 4 },
});

export default StatusCard;
