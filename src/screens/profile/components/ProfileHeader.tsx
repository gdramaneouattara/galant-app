import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Camera, ShieldCheck, Sparkles, Crown, Rocket } from 'lucide-react-native';
import ProfileBadges from '../../../components/ProfileBadges';
import { COLORS } from '../../../data/mock';

interface ProfileHeaderProps {
  currentUser: any;
  updatingProfilePhoto: boolean;
  onChangePhoto: () => void;
  goldenRoseTimeLeft: string | null;
  isBoosted: boolean;
  boostedUntilDate: Date | null;
  onSeePosition: () => void;
  colors: any;
  activeTheme: string;
  t: (key: any, params?: any) => string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  currentUser,
  updatingProfilePhoto,
  onChangePhoto,
  goldenRoseTimeLeft,
  isBoosted,
  boostedUntilDate,
  onSeePosition,
  colors,
  activeTheme,
  t,
}) => {
  return (
    <View style={styles.header}>
      <Pressable
        style={[styles.photoWrap, { backgroundColor: colors.card, borderColor: colors.card }]}
        onPress={onChangePhoto}
        disabled={updatingProfilePhoto}
      >
        <Image source={{ uri: currentUser.photos[0] }} style={styles.photo} />
        <View style={styles.photoEditBtn}>
          {updatingProfilePhoto ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Camera size={14} color="#fff" />
          )}
        </View>
      </Pressable>
      <Text style={[styles.photoHint, { color: colors.textMuted }]}>{t('logout')}</Text>

      <View style={styles.nameRow}>
        <Text style={[styles.name, { color: colors.text }]}>
          {currentUser.name}, {currentUser.age}
        </Text>
        {currentUser.is_verified && (
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color="#2563eb" />
            <Text style={styles.verifiedBadgeText}>{t('active')}</Text>
          </View>
        )}
        {currentUser.photo_review_status === 'PENDING' && (
          <View style={styles.reviewBadge}>
            <Text style={styles.reviewBadgeText}>En revue</Text>
          </View>
        )}
      </View>

      <View style={styles.badgeContainer}>
        {goldenRoseTimeLeft && (
          <View style={[styles.badge, styles.badgeGoldenRoseActive]}>
            <Sparkles size={14} color="#b45309" />
            <Text style={styles.badgeTextGoldenRose}>Rose d'Or : {goldenRoseTimeLeft}</Text>
          </View>
        )}
        <View style={[styles.badge, styles.badgeGarden]}>
          <Text style={styles.badgeTextGarden}>🌹 {t('roses')}: {currentUser.roses_count || 0}</Text>
        </View>
        <View style={[styles.badge, styles.badgeGalanterie]}>
          <Text style={styles.badgeTextGalanterie}>💎 {currentUser.galanterie_score?.toFixed(1) || '5.0'} / 5</Text>
        </View>
        <View style={[
          styles.badge,
          currentUser.is_premium ? styles.badgePremium : styles.badgeFree,
          !currentUser.is_premium && { backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#e2e8f0' }
        ]}>
          {currentUser.is_premium && <Crown size={14} color="#d97706" />}
          <Text style={[
            styles.badgeText,
            currentUser.is_premium ? styles.badgeTextPremium : styles.badgeTextFree,
            !currentUser.is_premium && { color: colors.textMuted }
          ]}>
            {currentUser.is_premium ? t('premium_member') : t('free_model')}
          </Text>
        </View>
        {isBoosted && (
          <View style={[styles.badge, styles.badgeBoosted]}>
            <Rocket size={14} color="#8b5cf6" />
            <Text style={[styles.badgeText, styles.badgeTextBoosted]}>{t('boosted_profile')}</Text>
          </View>
        )}
      </View>

      {boostedUntilDate && (
        <Pressable onPress={onSeePosition}>
          <Text style={styles.boostedUntil}>
            Boosté jusqu'au {boostedUntilDate.toLocaleDateString('fr-FR')} à {boostedUntilDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Voir ma position.
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 12,
  },
  photoWrap: {
    width: 120,
    height: 120,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 4,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoEditBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoHint: {
    marginTop: -4,
    fontSize: 11,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewBadge: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reviewBadgeText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgePremium: {
    backgroundColor: '#fef3c7',
  },
  badgeFree: {
    backgroundColor: '#e2e8f0',
  },
  badgeGarden: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
  },
  badgeBoosted: {
    backgroundColor: '#ede9fe',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextPremium: {
    color: '#b45309',
  },
  badgeTextFree: {
    color: '#64748b',
  },
  badgeTextGarden: {
    color: '#e11d48',
    fontWeight: '900',
    fontSize: 10,
  },
  badgeGoldenRoseActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
    borderWidth: 1,
  },
  badgeTextGoldenRose: {
    color: '#b45309',
    fontWeight: '900',
    fontSize: 10,
  },
  badgeGalanterie: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
  },
  badgeTextGalanterie: {
    color: '#1d4ed8',
    fontWeight: '900',
    fontSize: 10,
  },
  badgeTextBoosted: {
    color: '#7c3aed',
  },
  boostedUntil: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '600',
    marginTop: -4,
    textDecorationLine: 'underline',
  },
});

export default ProfileHeader;
