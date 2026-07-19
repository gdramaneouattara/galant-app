import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, Coffee, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../state/AppContext';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { apiRequest } from '../../lib/api';
import { uploadArrayBufferToBucket, getPublicUrl } from '../../lib/storageUpload';
import { getBoostActiveMessage, getBoostStatus } from '../../lib/boostStatus';

// Components
import ProfileHeader from './components/ProfileHeader';
import ProfileMenu from './components/ProfileMenu';
import BioModal from './components/BioModal';
import GoalModal from './components/GoalModal';
import SettingsModal from './components/SettingsModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Amour sérieux', icon: (props: any) => <Heart {...props} /> },
  { id: 'FRIENDSHIP', label: 'Amitié', icon: (props: any) => <Users {...props} /> },
  { id: 'CASUAL', label: 'On verra bien', icon: (props: any) => <Coffee {...props} /> },
];

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { currentUser, logout, toggleInvisibleMode, updateCurrentUser, activeTheme, colors, theme: themePreference, setThemePreference, language, setLanguage, t } = useApp();
  const [isTogglingInvisible, setIsTogglingInvisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [updatingProfilePhoto, setUpdatingProfilePhoto] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [goldenRoseTimeLeft, setGoldenRoseTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) setTempBio(currentUser.bio || '');
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.golden_rose_until) return;
    const interval = setInterval(() => {
      const diff = new Date(currentUser.golden_rose_until!).getTime() - Date.now();
      if (diff <= 0) {
        setGoldenRoseTimeLeft(null);
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setGoldenRoseTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.golden_rose_until]);

  if (!currentUser) return null;

  const boostStatus = getBoostStatus(currentUser.boosted_until);
  const isInvisibleEligible = !!currentUser.invisible_mode_eligible;
  const isInvisibleEnabled = !!currentUser.is_invisible && isInvisibleEligible;
  const hasQuarterlyLimitedInvisible = String(currentUser.subscription_plan_id || '').toUpperCase() === 'QUARTERLY' && currentUser.is_premium && currentUser.gender === 'MALE';

  const invisibleModeDescription = isInvisibleEnabled
    ? (hasQuarterlyLimitedInvisible ? 'Mode discret 3 mois actif.' : 'Votre profil est masqué dans la découverte standard.')
    : (isInvisibleEligible ? 'Masquez votre profil quand vous le souhaitez.' : 'Disponible avec Premium.');

  const currentGoal = RELATIONSHIP_GOALS.find(g => g.id === currentUser.relationship_goal) || RELATIONSHIP_GOALS[0];

  const handleInvisibleToggle = async (enabled: boolean) => {
    setIsTogglingInvisible(true);
    const success = await toggleInvisibleMode(enabled);
    if (!success) Alert.alert('Erreur', 'Impossible de mettre à jour le mode invisible.');
    setIsTogglingInvisible(false);
  };

  const handleBioUpdate = async () => {
    try {
      setSavingBio(true);
      await apiRequest('/api/profiles/update', { method: 'POST', requireAuth: true, body: JSON.stringify({ bio: tempBio.trim() }) });
      updateCurrentUser({ bio: tempBio.trim() });
      setShowBioModal(false);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setSavingBio(false); }
  };

  const getAiBioSuggestion = async () => {
    if (!currentUser?.is_premium) {
      Alert.alert("Assistant IA 💎", "L'amélioration de profil par IA est réservée aux membres Premium.", [{ text: "Plus tard" }, { text: "Premium", onPress: () => navigation.navigate('Premium') }]);
      return;
    }
    try {
      setAiLoading(true);
      const res = await apiRequest<{ suggestions: string[] }>('/api/ai/writing-assistant', { method: 'POST', requireAuth: true, body: JSON.stringify({ type: 'BIO_IMPROVEMENT', currentBio: tempBio, lang: language }) });
      if (res.suggestions?.length) setTempBio(res.suggestions[Math.floor(Math.random() * res.suggestions.length)]);
    } catch (e) { Alert.alert("Erreur IA", "Impossible de générer une suggestion."); }
    finally { setAiLoading(false); }
  };

  const changeProfilePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Permission requise', "Autorisez l'accès à la galerie.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      setUpdatingProfilePhoto(true);
      const asset = result.assets[0];
      const path = `profiles/${currentUser.id}/profile-${Date.now()}.jpg`;
      await uploadArrayBufferToBucket({ bucket: 'photos', path, uri: asset.uri, contentType: asset.mimeType || 'image/jpeg' });
      const publicUrl = await getPublicUrl('photos', path);

      const moderation = await apiRequest<{ status?: string }>('/api/moderation/photos/check', { method: 'POST', requireAuth: true, body: JSON.stringify({ photoUrls: [publicUrl] }) });
      if (String(moderation?.status).toUpperCase() === 'REJECTED') return Alert.alert('Photo refusée', "La photo ne respecte pas les règles.");

      const nextPhotos = [publicUrl, ...(currentUser.photos || []).slice(1)];
      updateCurrentUser({ photos: nextPhotos.slice(0, 6) });
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setUpdatingProfilePhoto(false); }
  };

  const exportData = async () => {
    try {
      setExportingData(true);
      const payload = await apiRequest<any>('/api/privacy/export', { requireAuth: true });
      await Share.share({ title: `export-${currentUser.id}.json`, message: JSON.stringify(payload, null, 2) });
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setExportingData(false); }
  };

  const deleteAccount = async () => {
    Alert.alert('Supprimer le compte', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await apiRequest('/api/account/delete', { method: 'POST', requireAuth: true });
          await logout();
        } catch (e: any) { Alert.alert('Erreur', e.message); }
      }},
    ]);
  };

  const handleShareInvite = async () => {
    try {
      const url = `https://galant.app/invite/${currentUser.id}`;
      const message = `Rejoins-moi sur Galant, l'application de rencontre la plus élégante ! Utilise mon lien pour t'inscrire : ${url}`;

      await Share.share({
        message,
        url, // iOS only
        title: 'Invitation Galant 🌹',
      });
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader
          currentUser={currentUser}
          updatingProfilePhoto={updatingProfilePhoto}
          onChangePhoto={changeProfilePhoto}
          goldenRoseTimeLeft={goldenRoseTimeLeft}
          isBoosted={boostStatus.active}
          boostedUntilDate={boostStatus.endsAt}
          onSeePosition={() => navigation.navigate('DiscoverGrid', { includeSelf: true })}
          colors={colors}
          activeTheme={activeTheme}
          t={t}
        />

        <ProfileMenu
          currentUser={currentUser}
          currentGoalLabel={currentGoal.label}
          currentGoalIcon={currentGoal.icon}
          invisibleModeEnabled={isInvisibleEnabled}
          isTogglingInvisible={isTogglingInvisible}
          invisibleModeDescription={invisibleModeDescription}
          isInvisibleEligible={isInvisibleEligible}
          exportingData={exportingData}
          deletingAccount={deletingAccount}
          onOpenDiscover={() => navigation.navigate('DiscoverGrid')}
          onOpenBio={() => setShowBioModal(true)}
          onOpenGoal={() => setShowGoalModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onToggleInvisible={handleInvisibleToggle}
          onVerify={() => navigation.navigate('Verify')}
          onGoPremium={() => navigation.navigate('Premium')}
          onOpenLikes={() => navigation.navigate('LikesReceived')}
          onOpenBoost={() => {
            const msg = getBoostActiveMessage(currentUser.boosted_until);
            if (msg) Alert.alert('Boost actif', msg);
            else navigation.navigate('Boost');
          }}
          onExportData={exportData}
          onDeleteAccount={deleteAccount}
          onShareInvite={handleShareInvite}
          onLogout={logout}
          colors={colors}
          activeTheme={activeTheme}
          t={t}
        />
      </ScrollView>

      <BioModal
        visible={showBioModal}
        onClose={() => setShowBioModal(false)}
        tempBio={tempBio}
        setTempBio={setTempBio}
        onSave={handleBioUpdate}
        onGetAiSuggestion={getAiBioSuggestion}
        is_premium={!!currentUser.is_premium}
        aiLoading={aiLoading}
        saving={savingBio}
        colors={colors}
        activeTheme={activeTheme}
      />

      <GoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        currentGoalId={currentUser.relationship_goal || ''}
        onUpdateGoal={(id) => { updateCurrentUser({ relationship_goal: id }); setShowGoalModal(false); }}
        colors={colors}
      />

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        themePreference={themePreference}
        onSetTheme={setThemePreference}
        language={language}
        onSetLanguage={setLanguage}
        t={t}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 18 },
});

export default ProfileScreen;
