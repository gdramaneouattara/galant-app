import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface UserCardProps {
  user: any;
  onSuspend: (user: any) => void;
  onDelete: (user: any) => void;
  isDeleting: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, onSuspend, onDelete, isDeleting }) => {
  const isSuspended = !!user.suspended_at;
  const isAdmin = user.is_admin === true;
  const is_premium = user.is_premium === true;
  const is_verified = user.is_verified === true;
  const photoReviewPending = user.photo_review_status === 'PENDING';

  const getUserInitial = (name: string) => name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={styles.userCard}>
      {user.photos?.[0] ? (
        <Image source={{ uri: user.photos[0] }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{getUserInitial(user.name)}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.name}>{user.name || 'Utilisateur sans nom'}</Text>
        <Text style={styles.email} numberOfLines={1}>{user.email || 'Email indisponible'}</Text>
        <Text style={styles.phone}>{user.phone || 'Telephone indisponible'}</Text>
        <Text style={styles.uid}>UID: {user.id}</Text>

        <View style={styles.badgesRow}>
          {isAdmin && <Text style={[styles.badge, styles.badgeAdmin]}>ADMIN</Text>}
          {is_premium && <Text style={[styles.badge, styles.badgePremium]}>PREMIUM</Text>}
          {is_verified ? (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color="#166534" />
              <Text style={styles.verifiedBadgeText}>VÉRIFIÉ</Text>
            </View>
          ) : (
            <Text style={[styles.badge, styles.badgeUnverified]}>NON VÉRIFIÉ</Text>
          )}
          {photoReviewPending && <Text style={[styles.badge, styles.badgeInReview]}>EN REVUE</Text>}
          {isSuspended && <Text style={[styles.badge, styles.badgeSuspended]}>SUSPENDU</Text>}
        </View>
      </View>
      <View style={styles.actionColumn}>
        <Pressable
          onPress={() => onSuspend(user)}
          style={[
            styles.suspendButton,
            isSuspended && styles.reactivateButton,
            isAdmin && styles.adminLockedButton,
          ]}
          disabled={isAdmin}
        >
          <Text style={[
            styles.suspendButtonText,
            isSuspended && styles.reactivateButtonText,
            isAdmin && styles.adminLockedButtonText,
          ]}>
            {isAdmin ? 'Admin' : isSuspended ? 'Réactiver' : 'Suspendre'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(user)}
          style={[
            styles.deleteButton,
            (isAdmin || isDeleting) && styles.adminLockedButton,
          ]}
          disabled={isAdmin || isDeleting}
        >
          <Text style={[
            styles.deleteButtonText,
            (isAdmin || isDeleting) && styles.adminLockedButtonText,
          ]}>
            {isDeleting ? '...' : 'Supprimer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: { width: 44, height: 44, borderRadius: 10 },
  avatarFallback: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  avatarFallbackText: { fontWeight: '800', color: '#1e3a8a' },
  userInfo: { flex: 1 },
  name: { fontWeight: '800', color: COLORS.ink },
  email: { fontSize: 12, color: COLORS.ink, marginTop: 1 },
  phone: { fontSize: 12, color: COLORS.ink, marginTop: 1 },
  uid: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  badgeAdmin: { backgroundColor: '#e0e7ff', color: '#3730a3' },
  badgePremium: { backgroundColor: '#fef3c7', color: '#b45309' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedBadgeText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  badgeUnverified: { backgroundColor: '#f1f5f9', color: '#475569' },
  badgeInReview: { backgroundColor: '#fef3c7', color: '#b45309' },
  badgeSuspended: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  actionColumn: { gap: 8, alignItems: 'stretch' },
  deleteButton: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fee2e2', borderRadius: 8 },
  deleteButtonText: { color: '#b91c1c', fontWeight: 'bold', fontSize: 12 },
  suspendButton: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fee2e2', borderRadius: 8 },
  reactivateButton: { backgroundColor: '#dcfce7' },
  adminLockedButton: { backgroundColor: '#e2e8f0' },
  suspendButtonText: { color: '#b91c1c', fontWeight: 'bold', fontSize: 12 },
  reactivateButtonText: { color: '#166534' },
  adminLockedButtonText: { color: '#475569' },
});

export default UserCard;
