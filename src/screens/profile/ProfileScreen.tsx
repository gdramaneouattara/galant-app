import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Crown, EyeOff, Heart, LogOut, Rocket, Settings, ShieldCheck, Trophy, Coffee, Users, X } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { COLORS } from '../../data/mock';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { apiRequest } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Amour sérieux', icon: (props: any) => <Heart {...props} /> },
  { id: 'FRIENDSHIP', label: 'Amitié', icon: (props: any) => <Users {...props} /> },
  { id: 'CASUAL', label: 'On verra bien', icon: (props: any) => <Coffee {...props} /> },
];

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { currentUser, logout, toggleInvisibleMode, updateCurrentUser } = useApp();
  const [isTogglingInvisible, setIsTogglingInvisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  if (!currentUser) {
    return null;
  }

  const isBoosted = currentUser.boosted_until && new Date(currentUser.boosted_until) > new Date();
  const boostedUntilDate = isBoosted ? new Date(currentUser.boosted_until!) : null;
  const isInvisibleEligible = !!currentUser.invisible_mode_eligible;
  const isInvisibleEnabled = !!currentUser.is_invisible && isInvisibleEligible;
  const normalizedPlan = String(currentUser.subscription_plan_id || '').toUpperCase();
  const hasQuarterlyLimitedInvisible =
    normalizedPlan === 'QUARTERLY' &&
    currentUser.isPremium &&
    String(currentUser.gender || '').toUpperCase() === 'MALE';
  const invisibleModeDescription = isInvisibleEnabled
    ? (hasQuarterlyLimitedInvisible
      ? 'Mode discret 3 mois actif: 20 profils/jour sans etre vu, 20 statuts/jour en discret, et masque du vu jusqu a 2h/jour.'
      : 'Votre profil est masque dans la decouverte standard. Les matchs existants et actions directes restent accessibles.')
    : (isInvisibleEligible
      ? (hasQuarterlyLimitedInvisible
        ? 'Activez le mode discret 3 mois: 20 profils/jour sans etre vu, 20 statuts/jour en discret, et masque du vu jusqu a 2h/jour.'
        : 'Masquez votre profil dans la decouverte standard quand vous le souhaitez.')
      : (currentUser.isPremium
        ? 'Votre formule Premium actuelle n inclut pas le mode invisible. Passez en Homme 3 mois (limite), 6 mois ou 1 an.'
        : 'Disponible sur Homme 3 mois (limite), 6 mois et 1 an.'));

  const currentGoal = RELATIONSHIP_GOALS.find(g => g.id === currentUser.relationship_goal) || RELATIONSHIP_GOALS[0];

  const handleInvisibleToggle = async (enabled: boolean) => {
    setIsTogglingInvisible(true);
    const success = await toggleInvisibleMode(enabled);
    if (!success) {
      Alert.alert('Erreur', 'Impossible de mettre a jour le mode invisible.');
    }
    setIsTogglingInvisible(false);
  };

  const handleGoalUpdate = (goalId: string) => {
    updateCurrentUser({ relationship_goal: goalId });
    setShowGoalModal(false);
  };

  const exportPersonalData = async () => {
    if (exportingData) return;

    try {
      setExportingData(true);
      const payload = await apiRequest<{
        filename: string;
        exported_at: string;
        format: 'json';
      } & Record<string, unknown>>('/api/privacy/export', {
        requireAuth: true,
      });

      const fileName = payload.filename || `yamo-export-${currentUser.id}.json`;
      const prettyJson = JSON.stringify(payload, null, 2);
      await Share.share({
        title: fileName,
        message: prettyJson,
      });
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || "Impossible d'exporter vos données.");
    } finally {
      setExportingData(false);
    }
  };

  const deleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await apiRequest('/api/account/delete', {
        method: 'POST',
        requireAuth: true,
      });
      Alert.alert('Compte supprime', 'Votre compte a ete supprime.');
      await logout();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de supprimer le compte.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est definitive. Votre profil et vos contenus seront supprimes.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => { void deleteAccount(); } },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.photoWrap}>
            <Image source={{ uri: currentUser.photos[0] }} style={styles.photo} />
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{currentUser.name}, {currentUser.age}</Text>
            {currentUser.isVerified ? (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={14} color="#2563eb" />
                <Text style={styles.verifiedBadgeText}>Vérifié</Text>
              </View>
            ) : null}
            {currentUser.photo_review_status === 'PENDING' ? (
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>En revue</Text>
              </View>
            ) : null}
          </View>
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

          {/* Objectif de Relation */}
          <Pressable style={styles.row} onPress={() => setShowGoalModal(true)}>
            <View style={[styles.rowIcon, { backgroundColor: '#fef2f2' }]}>
              {currentGoal.icon({ size: 18, color: COLORS.primary })}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Je cherche...</Text>
              <Text style={styles.rowSubLabel}>{currentGoal.label}</Text>
            </View>
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
                <Text style={styles.rowSubLabel}>{invisibleModeDescription}</Text>
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
                <Text style={styles.rowSubLabel}>{invisibleModeDescription}</Text>
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
          <Pressable style={[styles.row, styles.rowLikes]} onPress={() => navigation.navigate('LikesReceived')}>
            <View style={[styles.rowIcon, styles.rowIconLikes]}>
              <Heart size={18} color="#be123c" />
            </View>
            <Text style={styles.rowLabel}>Boîte Super Likes</Text>
            <ChevronRight size={18} color="#fda4af" />
          </Pressable>
          {!isBoosted && (
            <Pressable style={[styles.row, styles.rowBoost]} onPress={() => navigation.navigate('Boost' as never)}>
              <View style={[styles.rowIcon, styles.rowIconBoost]}>
                <Rocket size={18} color="#8b5cf6" />
              </View>
              <Text style={styles.rowLabel}>Booster mon profil</Text>
              <ChevronRight size={18} color="#c4b5fd" />
            </Pressable>
          )}
          <Pressable
            style={[styles.row, styles.rowPrivacy]}
            onPress={() => { void exportPersonalData(); }}
            disabled={exportingData}
          >
            <View style={[styles.rowIcon, styles.rowIconPrivacy]}>
              <ShieldCheck size={18} color="#0369a1" />
            </View>
            <Text style={styles.rowLabel}>
              {exportingData ? 'Préparation de l’export...' : 'Télécharger mes données'}
            </Text>
            <ChevronRight size={18} color="#7dd3fc" />
          </Pressable>
          <Pressable style={[styles.row, styles.rowPrivacyDelete]} onPress={confirmDeleteAccount} disabled={deletingAccount}>
            <View style={[styles.rowIcon, styles.rowIconPrivacyDelete]}>
              <LogOut size={18} color="#b91c1c" />
            </View>
            <Text style={styles.rowLabel}>{deletingAccount ? 'Suppression en cours...' : 'Supprimer mon compte'}</Text>
            <ChevronRight size={18} color="#fca5a5" />
          </Pressable>
        </View>

        <Pressable style={[styles.row, styles.rowLogout]} onPress={logout}>
          <View style={[styles.rowIcon, styles.rowIconLogout]}>
            <LogOut size={18} color="#e11d48" />
          </View>
          <Text style={[styles.rowLabel, styles.rowLabelLogout]}>Déconnexion</Text>
        </Pressable>
      </ScrollView>

      {/* Modal pour l'Objectif de Relation */}
      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Que cherches-tu ?</Text>
              <Pressable onPress={() => setShowGoalModal(false)}>
                <X color={COLORS.muted} size={24} />
              </Pressable>
            </View>
            <View style={styles.goalList}>
              {RELATIONSHIP_GOALS.map((goal) => {
                const active = currentUser.relationship_goal === goal.id;
                return (
                  <Pressable
                    key={goal.id}
                    style={[styles.goalCard, active && styles.goalCardActive]}
                    onPress={() => handleGoalUpdate(goal.id)}
                  >
                    <View style={[styles.goalIconWrap, active && styles.goalIconWrapActive]}>
                      {goal.icon({ color: active ? '#fff' : COLORS.primary, size: 24 })}
                    </View>
                    <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{goal.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  rowLikes: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  rowIconLikes: {
    backgroundColor: '#fff',
  },
  rowBoost: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ede9fe',
  },
  rowIconBoost: {
    backgroundColor: '#fff',
  },
  rowPrivacy: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  rowIconPrivacy: {
    backgroundColor: '#fff',
  },
  rowPrivacyDelete: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  rowIconPrivacyDelete: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
  },
  goalList: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  goalCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  goalIconWrapActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  goalLabelActive: {
    color: COLORS.primary,
  },
});

export default ProfileScreen;
