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
import { Heart, Coffee, Users, Briefcase } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../state/AppContext';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { apiRequest } from '../../lib/api';
import { uploadImageVariantsToBucket } from '../../lib/storageUpload';
import { getBoostActiveMessage, getBoostStatus } from '../../lib/boostStatus';

// Components
import ProfileHeader from './components/ProfileHeader';
import ProfileMenu from './components/ProfileMenu';
import BioModal from './components/BioModal';
import GoalModal from './components/GoalModal';
import SettingsModal from './components/SettingsModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', labelKey: 'serious_love', icon: (props: any) => <Heart {...props} /> },
  { id: 'FRIENDSHIP', labelKey: 'friendship_goal', icon: (props: any) => <Users {...props} /> },
  { id: 'NETWORKING', labelKey: 'networking_goal', icon: (props: any) => <Briefcase {...props} /> },
  { id: 'CASUAL', labelKey: 'casual_goal', icon: (props: any) => <Coffee {...props} /> },
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
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  useEffect(() => {
    if (currentUser) setTempBio(currentUser.bio || '');
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser) {
      setNotificationUnreadCount(0);
      return;
    }

    apiRequest<{ unreadCount: number }>('/api/notifications/unread-count', { requireAuth: true })
      .then((payload) => {
        if (!cancelled) setNotificationUnreadCount(Number(payload.unreadCount || 0));
      })
      .catch(() => {
        if (!cancelled) setNotificationUnreadCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

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
    ? (hasQuarterlyLimitedInvisible ? t('invisible_mode_active_short') : t('invisible_profile_hidden'))
    : (isInvisibleEligible ? t('invisible_mode_available') : t('available_with_premium'));

  const currentGoal = RELATIONSHIP_GOALS.find(g => g.id === currentUser.relationship_goal) || RELATIONSHIP_GOALS[0];

  const handleInvisibleToggle = async (enabled: boolean) => {
    setIsTogglingInvisible(true);
    const success = await toggleInvisibleMode(enabled);
    if (!success) Alert.alert(t('error'), t('invisible_mode_update_failed'));
    setIsTogglingInvisible(false);
  };

  const handleBioUpdate = async () => {
    try {
      setSavingBio(true);
      await apiRequest('/api/profiles/update', { method: 'POST', requireAuth: true, body: JSON.stringify({ bio: tempBio.trim() }) });
      updateCurrentUser({ bio: tempBio.trim() });
      setShowBioModal(false);
    } catch (e: any) { Alert.alert(t('error'), e.message); }
    finally { setSavingBio(false); }
  };

  const getAiBioSuggestion = async () => {
    if (!currentUser?.is_premium) {
      Alert.alert(t('ai_assistant_title'), t('ai_profile_premium_only'), [{ text: t('maybe_later_short') }, { text: 'Premium', onPress: () => navigation.navigate('Premium') }]);
      return;
    }
    try {
      setAiLoading(true);
      const res = await apiRequest<{ suggestions: string[] }>('/api/ai/writing-assistant', { method: 'POST', requireAuth: true, body: JSON.stringify({ type: 'BIO_IMPROVEMENT', currentBio: tempBio, lang: language }) });
      if (res.suggestions?.length) setTempBio(res.suggestions[Math.floor(Math.random() * res.suggestions.length)]);
    } catch (e) { Alert.alert(t('ai_error'), t('ai_error_desc')); }
    finally { setAiLoading(false); }
  };

  const changeProfilePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert(t('permission_required'), t('gallery_permission_body'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      setUpdatingProfilePhoto(true);
      const asset = result.assets[0];
      const path = `profiles/${currentUser.id}/profile-${Date.now()}.webp`;
      const { fullUrl: publicUrl, variants } = await uploadImageVariantsToBucket({ bucket: 'photos', path, uri: asset.uri });

      const moderation = await apiRequest<{ status?: string }>('/api/moderation/photos/check', { method: 'POST', requireAuth: true, body: JSON.stringify({ photoUrls: [publicUrl] }) });
      if (String(moderation?.status).toUpperCase() === 'REJECTED') return Alert.alert(t('photo_rejected'), t('photo_rejected_body'));

      const maxPhotos = currentUser.is_premium || currentUser.is_vip ? 6 : 3;
      const nextPhotos = [publicUrl, ...(currentUser.photos || []).slice(1)].slice(0, maxPhotos);
      const nextPhotoVariants = {
        ...(currentUser.photo_variants || {}),
        [publicUrl]: variants,
      };
      const payload = await apiRequest<{ profile?: any }>('/api/profiles/update', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ photos: nextPhotos, photo_variants: nextPhotoVariants }),
      });
      updateCurrentUser({
        photos: payload.profile?.photos || nextPhotos,
        photo_variants: payload.profile?.photo_variants || nextPhotoVariants,
      });
    } catch (e: any) { Alert.alert(t('error'), e.message); }
    finally { setUpdatingProfilePhoto(false); }
  };

  const exportData = async () => {
    try {
      setExportingData(true);
      const payload = await apiRequest<any>('/api/privacy/export', { requireAuth: true });
      await Share.share({ title: `export-${currentUser.id}.json`, message: JSON.stringify(payload, null, 2) });
    } catch (e: any) { Alert.alert(t('error'), e.message); }
    finally { setExportingData(false); }
  };

  const deleteAccount = async () => {
    Alert.alert(t('delete_account_title'), t('delete_account_body'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => {
        try {
          await apiRequest('/api/privacy/delete-account', { method: 'POST', requireAuth: true });
          await logout();
        } catch (e: any) { Alert.alert(t('error'), e.message); }
      }},
    ]);
  };

  const handleShareInvite = async () => {
    try {
      const url = `https://galant.app/invite/${currentUser.id}`;
      const message = t('invite_share_body', { url });

      await Share.share({
        message,
        url, // iOS only
        title: t('invite_share_title'),
      });
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
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
          currentGoalLabel={t(currentGoal.labelKey as any)}
          currentGoalIcon={currentGoal.icon}
          invisibleModeEnabled={isInvisibleEnabled}
          isTogglingInvisible={isTogglingInvisible}
          invisibleModeDescription={invisibleModeDescription}
          isInvisibleEligible={isInvisibleEligible}
          onOpenDiscover={() => navigation.navigate('DiscoverGrid')}
          onOpenAdmin={() => navigation.navigate('AdminStack')}
          onOpenBio={() => setShowBioModal(true)}
          onOpenGoal={() => setShowGoalModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenNotifications={() => navigation.navigate('Notifications')}
          onToggleInvisible={handleInvisibleToggle}
          onVerify={() => navigation.navigate('Verify')}
          onGoPremium={() => navigation.navigate('Premium')}
          onOpenLikes={() => navigation.navigate('LikesReceived')}
          onOpenBoost={() => {
            const msg = getBoostActiveMessage(currentUser.boosted_until);
            if (msg) Alert.alert(t('boost_active'), msg);
            else navigation.navigate('Boost');
          }}
          notificationUnreadCount={notificationUnreadCount}
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
        onUpdateGoal={async (id) => {
          try {
            const payload = await apiRequest<{ profile?: any }>('/api/profiles/update', {
              method: 'POST',
              requireAuth: true,
              body: JSON.stringify({ relationship_goal: id }),
            });
            updateCurrentUser({ relationship_goal: payload.profile?.relationship_goal || id });
            setShowGoalModal(false);
          } catch (e: any) {
            Alert.alert(t('error'), e.message || t('goal_update_failed'));
          }
        }}
        colors={colors}
      />

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        themePreference={themePreference}
        onSetTheme={setThemePreference}
        language={language}
        onSetLanguage={setLanguage}
        onExportData={exportData}
        onDeleteAccount={deleteAccount}
        exportingData={exportingData}
        deletingAccount={deletingAccount}
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
