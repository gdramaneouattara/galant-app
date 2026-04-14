import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ShieldCheck, Flame, Crown, Rocket } from 'lucide-react-native';

type ProfileBadgeUser = {
  isVerified?: boolean;
  is_verified?: boolean;
  isPremium?: boolean;
  is_premium?: boolean;
  boosted_until?: string | null;
  last_active_at?: string | null;
  likes_count?: number;
};

interface ProfileBadgesProps {
  user: ProfileBadgeUser;
  containerStyle?: ViewStyle;
  showLabels?: boolean;
}

const ProfileBadges: React.FC<ProfileBadgesProps> = ({ user, containerStyle, showLabels = false }) => {
  const isVerified = user.isVerified ?? user.is_verified ?? false;
  const isPremium = user.isPremium ?? user.is_premium ?? false;
  const likesCount = user.likes_count || 0;
  const isRecentlyActive = user.last_active_at
    ? (new Date().getTime() - new Date(user.last_active_at).getTime()) < 24 * 60 * 60 * 1000
    : false;
  const isPopular = likesCount >= 50;
  const isBoosted = user.boosted_until
    ? new Date(user.boosted_until).getTime() > new Date().getTime()
    : false;

  return (
    <View style={[styles.container, containerStyle]}>
      {isVerified && (
        <View style={[styles.badge, styles.verifiedBadge]}>
          <ShieldCheck size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>Verifie</Text>}
        </View>
      )}

      {isPopular && (
        <View style={[styles.badge, styles.popularBadge]}>
          <Flame size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>Populaire</Text>}
        </View>
      )}

      {isRecentlyActive && (
        <View style={[styles.badge, styles.activeBadge]}>
          <View style={styles.activeDot} />
          {showLabels && <Text style={styles.badgeText}>Actif</Text>}
        </View>
      )}

      {isPremium && (
        <View style={[styles.badge, styles.premiumBadge]}>
          <Crown size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>Premium</Text>}
        </View>
      )}

      {isBoosted && (
        <View style={[styles.badge, styles.boostedBadge]}>
          <Rocket size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>Booste</Text>}
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
    backgroundColor: '#3b82f6',
  },
  popularBadge: {
    backgroundColor: '#f97316',
  },
  activeBadge: {
    backgroundColor: '#16a34a',
  },
  premiumBadge: {
    backgroundColor: '#7c3aed',
  },
  boostedBadge: {
    backgroundColor: '#dc2626',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default ProfileBadges;
