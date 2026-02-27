import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Crown, EyeOff, LogOut, Rocket, Settings, ShieldCheck, Trophy } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import type { RootStackParamList } from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { currentUser, logout, toggleInvisibleMode } = useApp();
  const [isTogglingInvisible, setIsTogglingInvisible] = useState(false);

  if (!currentUser) {
    return null;
  }

  const isBoosted = currentUser.boosted_until && new Date(currentUser.boosted_until) > new Date();
  const boostedUntilDate = isBoosted ? new Date(currentUser.boosted_until!) : null;
  const isInvisibleEligible = !!currentUser.invisible_mode_eligible;
  const isInvisibleEnabled = !!currentUser.is_invisible && currentUser.isPremium && isInvisibleEligible;

  const handleInvisibleToggle = async (enabled: boolean) => {
    setIsTogglingInvisible(true);
    const success = await toggleInvisibleMode(enabled);
    if (!success) {
      Alert.alert('Erreur', 'Impossible de mettre a jour le mode invisible.');
    }
    setIsTogglingInvisible(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.photoWrap}>
            <Image source={{ uri: currentUser.photos[0] }} style={styles.photo} />
          </View>
          <Text style={styles.name}>{currentUser.name}, {currentUser.age}</Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, currentUser.isPremium ? styles.badgePremium : styles.badgeFree]}>
              {currentUser.isPremium && <Crown size={14} color="#d97706" />}
              <Text style={[styles.badgeText, currentUser.isPremium ? styles.badgeTextPremium : styles.badgeTextFree]}>
                {currentUser.isPremium ? 'Membre Premium' : 'MODÈLE GRATUIT'}
              </Text>
            </View>
            {isBoosted && (
              <View style={[styles.badge, styles.badgeBoosted]}>
                <Rocket size={14} color="#8b5cf6" />
                <Text style={[styles.badgeText, styles.badgeTextBoosted]}>PROFIL BOOSTÉ</Text>
              </View>
            )}
          </View>
          {boostedUntilDate && (
            <Pressable onPress={() => navigation.navigate('DiscoverGrid')}>
              <Text style={styles.boostedUntil}>
                Boosté jusqu'au {boostedUntilDate.toLocaleDateString('fr-FR')} à {boostedUntilDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Voir ma position.
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Pressable style={styles.row} onPress={() => navigation.navigate('DiscoverGrid')}>
            <View style={styles.rowIcon}>
              <Trophy size={18} color={COLORS.muted} />
            </View>
            <Text style={styles.rowLabel}>Voir le Classement</Text>
            <ChevronRight size={18} color="#cbd5f5" />
          </Pressable>
          <Pressable style={styles.row}>
            <View style={styles.rowIcon}>
              <Settings size={18} color={COLORS.muted} />
            </View>
            <Text style={styles.rowLabel}>Paramètres de Compte</Text>
            <ChevronRight size={18} color="#cbd5f5" />
          </Pressable>
          {isInvisibleEligible ? (
            <Pressable
              style={[styles.row, styles.rowInvisible]}
              onPress={() => { void handleInvisibleToggle(!isInvisibleEnabled); }}
              disabled={isTogglingInvisible}
            >
              <View style={[styles.rowIcon, styles.rowIconInvisible]}>
                <EyeOff size={18} color="#0f766e" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Mode invisible</Text>
                <Text style={styles.rowSubLabel}>
                  {isInvisibleEnabled
                    ? 'Votre profil est masque dans la decouverte.'
                    : 'Masquez votre profil dans la decouverte.'}
                </Text>
              </View>
              {isTogglingInvisible ? (
                <Text style={styles.rowStatus}>...</Text>
              ) : (
                <View style={[styles.rowStatusPill, isInvisibleEnabled && styles.rowStatusPillActive]}>
                  <Text style={[styles.rowStatusPillText, isInvisibleEnabled && styles.rowStatusPillTextActive]}>
                    {isInvisibleEnabled ? 'ACTIF' : 'INACTIF'}
                  </Text>
                </View>
              )}
            </Pressable>
          ) : (
            <Pressable style={[styles.row, styles.rowInvisibleLocked]} onPress={() => navigation.navigate('Premium' as never)}>
              <View style={[styles.rowIcon, styles.rowIconInvisibleLocked]}>
                <EyeOff size={18} color="#6b7280" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Mode invisible</Text>
                <Text style={styles.rowSubLabel}>Disponible uniquement sur les abonnements 6 mois et 1 an.</Text>
              </View>
              <ChevronRight size={18} color="#cbd5f5" />
            </Pressable>
          )}
          {!currentUser.isVerified && (
            <Pressable style={[styles.row, styles.rowVerify]} onPress={() => navigation.navigate('Verify' as never)}>
              <View style={[styles.rowIcon, styles.rowIconVerify]}>
                <ShieldCheck size={18} color="#2563eb" />
              </View>
              <Text style={[styles.rowLabel, styles.rowLabelVerify]}>Vérifier mon identité</Text>
              <ChevronRight size={18} color="#93c5fd" />
            </Pressable>
          )}
          {!currentUser.isPremium && (
            <Pressable style={[styles.row, styles.rowPremium]} onPress={() => navigation.navigate('Premium' as never)}>
              <View style={[styles.rowIcon, styles.rowIconPremium]}>
                <Crown size={18} color="#d97706" />
              </View>
              <Text style={styles.rowLabel}>Passer Premium</Text>
              <ChevronRight size={18} color="#facc15" />
            </Pressable>
          )}
          {!isBoosted && (
            <Pressable style={[styles.row, styles.rowBoost]} onPress={() => navigation.navigate('Boost' as never)}>
              <View style={[styles.rowIcon, styles.rowIconBoost]}>
                <Rocket size={18} color="#8b5cf6" />
              </View>
              <Text style={styles.rowLabel}>Booster mon profil</Text>
              <ChevronRight size={18} color="#c4b5fd" />
            </Pressable>
          )}
        </View>

        <Pressable style={[styles.row, styles.rowLogout]} onPress={logout}>
          <View style={[styles.rowIcon, styles.rowIconLogout]}>
            <LogOut size={18} color="#e11d48" />
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelLogout]}>Déconnexion</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    gap: 18,
  },
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
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
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
    color: COLORS.muted,
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
  section: {
    gap: 12,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  rowLabel: {
    flex: 1,
    fontWeight: '700',
    color: COLORS.ink,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowSubLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  rowStatus: {
    color: COLORS.muted,
    fontWeight: '700',
  },
  rowStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f8fafc',
  },
  rowStatusPillActive: {
    borderColor: '#99f6e4',
    backgroundColor: '#ccfbf1',
  },
  rowStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  rowStatusPillTextActive: {
    color: '#0f766e',
  },
  rowInvisible: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
  },
  rowIconInvisible: {
    backgroundColor: '#ffffff',
  },
  rowInvisibleLocked: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  rowIconInvisibleLocked: {
    backgroundColor: '#ffffff',
  },
  rowVerify: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  rowLabelVerify: {
    color: '#1d4ed8',
  },
  rowIconVerify: {
    backgroundColor: '#fff',
  },
  rowPremium: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  rowIconPremium: {
    backgroundColor: '#fff',
  },
  rowBoost: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ede9fe',
  },
  rowIconBoost: {
    backgroundColor: '#fff',
  },
  rowLogout: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  rowIconLogout: {
    backgroundColor: '#fff',
  },
  rowLabelLogout: {
    color: '#be123c',
    fontWeight: '800',
  },
});

export default ProfileScreen;
