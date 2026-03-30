import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ShieldCheck, Flame } from 'lucide-react-native';
import { User } from '../types';

interface ProfileBadgesProps {
  user: User;
  containerStyle?: ViewStyle;
  showLabels?: boolean;
}

const ProfileBadges: React.FC<ProfileBadgesProps> = ({ user, containerStyle, showLabels = false }) => {
  const isRecentlyActive = user.last_active_at
    ? (new Date().getTime() - new Date(user.last_active_at).getTime()) < 24 * 60 * 60 * 1000
    : false;

  const isPopular = user.likes_count >= 50;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Badge Vérifié */}
      {user.isVerified && (
        <View style={[styles.badge, styles.verifiedBadge]}>
          <ShieldCheck size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>Vérifié</Text>}
        </View>
      )}

      {/* Badge Populaire */}
      {isPopular && (
        <View style={[styles.badge, styles.popularBadge]}>
          <Flame size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>Populaire</Text>}
        </View>
      )}

      {/* Badge Actif */}
      {isRecentlyActive && (
        <View style={[styles.badge, styles.activeBadge]}>
          <View style={styles.activeDot} />
          {showLabels && <Text style={styles.badgeText}>Actif</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  verifiedBadge: {
    backgroundColor: '#3b82f6', // Bleu
  },
  popularBadge: {
    backgroundColor: '#f97316', // Orange/Flamme
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // Vert transparent
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default ProfileBadges;
