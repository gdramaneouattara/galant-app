import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ShieldCheck, Flame, Crown, Rocket, Gem, Star } from 'lucide-react-native';
import { useApp } from '../state/AppContext';

type ProfileBadgeUser = {
  is_verified?: boolean;
  is_premium?: boolean;
  is_vip?: boolean;
  boosted_until?: string | null;
  last_active_at?: string | null;
  likes_count?: number;
  galanterie_score?: number;
  gender?: string;
};

interface ProfileBadgesProps {
  user: ProfileBadgeUser;
  containerStyle?: ViewStyle;
  showLabels?: boolean;
}

const ProfileBadges: React.FC<ProfileBadgesProps> = ({ user, containerStyle, showLabels = false }) => {
  const { currentUser } = useApp();
  const is_verified = user.is_verified ?? false;
  const is_premium = user.is_premium ?? false;
  const is_vip = user.is_vip ?? false;
  const likesCount = user.likes_count || 0;
  const isRecentlyActive = user.last_active_at
    ? (new Date().getTime() - new Date(user.last_active_at).getTime()) < 24 * 60 * 60 * 1000
    : false;
  const isPopular = likesCount >= 50;
  const isBoosted = user.boosted_until
    ? new Date(user.boosted_until).getTime() > new Date().getTime()
    : false;

  const galanterieScore = user.galanterie_score || 5.0;
  const isEliteBehavior = galanterieScore >= 4.5;
  const isGentleman = isEliteBehavior && String(user.gender || '').toUpperCase() === 'MALE';
  const isLady = isEliteBehavior && String(user.gender || '').toUpperCase() === 'FEMALE';

  // "Courtoisie" Badge logic: Visible to all women or Premium men
  const canSeeCourtoisie =
    String(currentUser?.gender || '').toUpperCase() === 'FEMALE' ||
    currentUser?.is_premium;

  return (
    <View style={[styles.container, containerStyle]}>
      {canSeeCourtoisie && String(user.gender || '').toUpperCase() === 'MALE' && (
        <View style={[styles.badge, styles.courtoisieBadge]}>
          <Star size={12} color="#fff" fill="#fff" />
          <Text style={styles.badgeText}>{galanterieScore.toFixed(1)} Courtoisie</Text>
        </View>
      )}

      {(isGentleman || isLady) && (
        <View style={[styles.badge, styles.galantBadge]}>
          <Gem size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>{isGentleman ? 'Gentleman' : 'Élégante'}</Text>}
        </View>
      )}

      {is_vip && (
        <View style={[styles.badge, styles.vipBadge]}>
          <Gem size={14} color="#fff" />
          {showLabels && <Text style={styles.badgeText}>VIP</Text>}
        </View>
      )}

      {is_verified && (
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

      {is_premium && !is_vip && (
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
  vipBadge: {
    backgroundColor: '#f59e0b',
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
  courtoisieBadge: {
    backgroundColor: '#0ea5e9', // Blue color to signify safety/trust
  },
  galantBadge: {
    backgroundColor: '#be123c',
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
