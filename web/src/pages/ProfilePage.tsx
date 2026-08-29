import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Camera, ShieldCheck, MapPin, Edit3, Save, LogOut,
  Sparkles, Plane, Globe, ChevronRight, Share2,
  EyeOff, Eye, Crown, Settings, User as UserIcon, Bell,
  Heart, LayoutDashboard, Lock,
  ShoppingBag as StoreIcon
} from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { apiRequest } from '@shared/lib/api';
import { useNavigate } from 'react-router-dom';
import PassportModal from '../components/PassportModal';
import SettingsModal from '../components/SettingsModal';
import GoalModal, { getRelationshipGoalLabel } from '../components/GoalModal';
import { hasAdminProfileAccess } from '../lib/adminAccess';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';
import { uploadImageVariantsWeb } from '../lib/imageUploadVariants';
import ProfileFacts from '../components/ProfileFacts';

const ProfilePage: React.FC = () => {
  const { user, profile, logout, t, language } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoalOpen, setIsGoalOpen] = useState(false);
  const [isTogglingInvisible, setIsTogglingInvisible] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const maxProfilePhotos = profile?.is_premium || profile?.is_vip ? 6 : 3;
  const labels = language === 'en'
    ? {
        preparing: 'Preparing your elegance...',
        profileNotFound: 'Profile not found',
        login: 'Log in',
        addPhoto: 'Add a photo',
        cityMissing: 'City not set',
        received: 'Received',
        adminSubtitle: 'Open the admin dashboard',
        storeSubtitle: 'Subscriptions, Roses & Boosts',
        inviteTitle: 'Invite a Friend',
        inviteSubtitle: 'Earn Roses to use for free',
        goal: 'I am looking for...',
        travelMode: 'Travel Mode',
        changeCity: 'Change city',
        certification: 'Certification',
        bioPlaceholder: 'Describe your elegance...',
        emptyBio: 'No bio yet. Tap the edit icon to introduce yourself.'
      }
    : {
        preparing: 'Préparation de votre élégance...',
        profileNotFound: 'Profil non trouve',
        login: 'Se connecter',
        addPhoto: 'Ajouter une photo',
        cityMissing: 'Ville non renseignee',
        received: 'Recues',
        adminSubtitle: 'Ouvrir le dashboard administrateur',
        storeSubtitle: 'Abonnements, Roses & Boosts',
        inviteTitle: 'Inviter un Ami',
        inviteSubtitle: 'Gagnez des Roses à consommer gratuitement',
        goal: 'Je cherche...',
        travelMode: 'Mode Voyage',
        changeCity: 'Changez de ville',
        certification: 'Certification',
        bioPlaceholder: 'Décrivez votre élégance...',
        emptyBio: "Aucune bio rédigée pour le moment. Cliquez sur l'icône éditer pour vous présenter."
      };

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setHasAdminAccess(false);
      return;
    }

    if (hasAdminProfileAccess(profile, user.uid)) {
      setHasAdminAccess(true);
      return;
    }

    apiRequest('/api/admin/stats', { requireAuth: true })
      .then(() => {
        if (!cancelled) setHasAdminAccess(true);
      })
      .catch(() => {
        if (!cancelled) setHasAdminAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, profile?.id, profile?.is_admin]);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
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
  }, [user]);

  // Éviter l'écran blanc si les données ne sont pas encore là
  if (loading && !profile) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{labels.preparing}</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="max-w-md mx-auto py-20 text-center px-6">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-white/10 transition-colors">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
            <UserIcon size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{labels.profileNotFound}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">{t('login_required_profile')}</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            {labels.login}
          </button>
        </div>
      </div>
    );
  }

  const handleToggleInvisible = async () => {
    if (!profile.is_premium || !profile.invisible_mode_eligible) {
      showAlert(t('premium_required'), t('invisible_premium_only'));
      navigate('/store');
      return;
    }

    setIsTogglingInvisible(true);
    try {
      const newValue = !profile.is_invisible;
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, { is_invisible: newValue });
      showAlert(t('invisible_mode'), newValue ? t('profile_now_hidden') : t('profile_now_visible'));
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setIsTogglingInvisible(false);
    }
  };

  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    try {
      const data = await apiRequest<any>('/api/privacy/export', { requireAuth: true });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `galant-data-${user.uid}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert(t('success'), t('data_export_ready'));
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Êtes-vous certain de vouloir supprimer votre compte définitivement ? Cette action est irréversible.")) {
      return;
    }
    setDeletingAccount(true);
    try {
      await apiRequest('/api/privacy/delete-account', { method: 'POST', requireAuth: true });
      showAlert(t('account_deleted'), t('account_deleted_body'));
      logout();
    } catch (e: any) {
      showAlert(t('error'), e.message);
      setDeletingAccount(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, {
        name,
        bio,
        updated_at: new Date().toISOString()
      });
      setEditing(false);
      showAlert(t('success'), t('profile_updated'));
    } catch (error: any) {
      showAlert(t('error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (goalId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, COLLECTIONS.PROFILES, user.uid);
      await updateDoc(userRef, { relationship_goal: goalId });
      setIsGoalOpen(false);
      showAlert(t('updated'), t('goal_updated'));
    } catch (e: any) {
      showAlert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiAssist = async () => {
    if (!profile?.is_premium) {
      showAlert(t('premium_required'), t('ai_assistant_exclusive'));
      navigate('/store');
      return;
    }

    setGenerating(true);
    try {
      const res = await apiRequest<{ suggestions: string[] }>('/api/ai/writing-assistant', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          type: 'BIO',
          lang: language,
          currentBio: bio,
          context: { name: profile.name, currentBio: bio }
        })
      });
      if (res.suggestions?.[0]) {
        setBio(res.suggestions[0]);
      }
    } catch (error) {
      showAlert(t('ai_error'), t('ai_error_desc'));
    } finally {
      setGenerating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if ((profile.photos?.length || 0) >= maxProfilePhotos) {
        showAlert(t('limit_reached'), profile?.is_premium || profile?.is_vip ? t('premium_photo_limit') : t('free_photo_limit'));
        return;
      }
      const { fullUrl: url, variants } = await uploadImageVariantsWeb(file, `profiles/${user.uid}/${Date.now()}.webp`);

      const moderation = await apiRequest<{ status?: string }>('/api/moderation/photos/check', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ photoUrls: [url] }),
      });
      if (String(moderation?.status).toUpperCase() === 'REJECTED') {
        showAlert(t('photo_rejected'), t('photo_rejected_body'));
        return;
      }

      const newPhotos = [url, ...(profile.photos || [])].slice(0, maxProfilePhotos);
      const newPhotoVariants = {
        ...(profile.photo_variants || {}),
        [url]: variants,
      };
      await apiRequest('/api/profiles/update', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ photos: newPhotos, photo_variants: newPhotoVariants }),
      });

      showAlert(t('photo_added'), t('photo_added_body'));
    } catch (error: any) {
      showAlert(t('upload_error'), error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      {/* Header Profile - Premium Style */}
      <div className="relative mb-12 transition-colors">
        <div className="h-64 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 transition-colors">
          <OptimizedImage
            src={optimizedPhotoUrl(profile.photos?.[0], profile.photo_variants, 'medium') || `https://placehold.co/1200x400?text=${encodeURIComponent(labels.addPhoto)}`}
            className="w-full h-full object-cover"
            alt=""
            eager
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Status Badge Over Image */}
          <div className="absolute top-6 left-6 flex gap-2">
            {profile.is_premium && (
              <div className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-prestige shadow-lg flex items-center gap-2">
                <Crown size={14} fill="currentColor" />
                Premium
              </div>
            )}
            {profile.is_verified && (
              <div className="bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-prestige shadow-lg flex items-center gap-2">
                <ShieldCheck size={14} fill="currentColor" />
                Vérifié
              </div>
            )}
          </div>

          <label className="absolute top-6 right-6 w-11 h-11 bg-primary/90 text-white rounded-2xl shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all border-2 border-white/30 backdrop-blur-md z-20">
            {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Camera size={18} />}
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>

        {/* Floating Name & Stats - Lowered and refined */}
        <div className="absolute bottom-6 left-8 right-8 flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="text-white drop-shadow-2xl text-left">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl md:text-4xl font-black border-b-2 border-primary outline-none bg-transparent w-full md:w-auto"
              />
            ) : (
              <h2 className="text-xl md:text-4xl font-bold tracking-tighter leading-tight">{profile.name}, {profile.age}</h2>
            )}
            <div className="flex items-center gap-2 text-white/90 font-medium text-[10px] md:text-xs uppercase tracking-prestige mt-1">
              <MapPin size={12} className="text-primary" />
              <span>{(profile.city || labels.cityMissing).toUpperCase()}</span>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl flex flex-col items-center min-w-[75px] border border-white/50 dark:border-white/10 transition-all">
              <span className="text-lg font-black text-primary leading-none">{profile.galanterie_score || '5.0'}</span>
              <span className="text-[7px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige mt-1">Galanterie</span>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl flex flex-col items-center min-w-[75px] border border-white/50 dark:border-white/10 transition-all">
              <span className="text-lg font-black text-rose-500 leading-none">{profile.likes_count || 0}</span>
              <span className="text-[7px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige mt-1">Likes</span>
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl flex flex-col items-center min-w-[75px] border border-white/50 dark:border-white/10 transition-all">
              <span className="text-lg font-black text-amber-600 leading-none">{profile.roses_count || 0}</span>
              <span className="text-[7px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige mt-1">{labels.received}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[2rem] border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/50 transition-colors dark:border-white/10 dark:bg-slate-900 dark:shadow-none">
        <ProfileFacts profile={profile} language={language} variant="panel" includeLocation includeStatus />
      </div>

      {hasAdminAccess && (
        <button
          onClick={() => navigate('/admin')}
          className="mb-6 flex w-full items-center gap-4 rounded-[2rem] bg-primary p-4 text-left text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <LayoutDashboard size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-tight">Admin</p>
            <p className="text-[10px] font-bold text-white/70">{labels.adminSubtitle}</p>
          </div>
          <ChevronRight size={16} className="text-white/60" />
        </button>
      )}

      {/* STORE ACCESS - New Grouped Section */}
      <button
        onClick={() => navigate('/store')}
        className="mb-6 flex w-full items-center gap-5 rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-left text-white shadow-2xl shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
          <StoreIcon size={28} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold tracking-tighter uppercase leading-none mb-1">Store Galant</h3>
          <p className="text-[10px] font-black uppercase tracking-prestige text-white/80">{labels.storeSubtitle}</p>
        </div>
        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm group-hover:translate-x-1 transition-transform">
          <ChevronRight size={20} />
        </div>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        {/* Left Column: Info & Bio */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/10 transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">{t('my_bio')}</h3>
              <div className="flex gap-2">
                {editing && (
                  <button
                    onClick={handleAiAssist}
                    disabled={generating}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    <Sparkles size={12} />
                    IA
                  </button>
                )}
                <button
                  onClick={() => editing ? handleUpdateProfile() : setEditing(true)}
                  disabled={loading}
                  className={`p-3 rounded-xl transition-all ${
                    editing ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary'
                  }`}
                >
                  {editing ? <Save size={18} /> : <Edit3 size={18} />}
                </button>
              </div>
            </div>

            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-primary/10 font-medium text-slate-700 dark:text-slate-200 leading-relaxed text-lg transition-colors"
                placeholder={labels.bioPlaceholder}
              />
            ) : (
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-lg  transition-colors">
                {profile.bio || labels.emptyBio}
              </p>
            )}
          </div>

          {/* Invitation Card */}
          <div
            className={`p-8 rounded-[2.5rem] flex items-center justify-between group transition-all shadow-2xl relative overflow-hidden ${
              profile.can_invite
                ? 'bg-slate-900 dark:bg-slate-800 text-white cursor-pointer hover:scale-[1.01]'
                : 'bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 opacity-80 cursor-default'
            }`}
            onClick={() => {
              if (!profile.can_invite) {
                showAlert('Programme Ambassadeur 💎', 'Ce privilège est réservé aux partenaires exclusifs de Galant. Collaborez avec nous pour débloquer cette option.');
                return;
              }
              const url = `https://galant.app/invite/${user.uid}`;
              navigator.clipboard.writeText(url);
              showAlert(t('link_copied'), t('invite_link_copied_body'));
            }}
          >
            <div className="flex items-center gap-6 relative z-10">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform ${
                profile.can_invite ? 'bg-white/10 text-primary group-hover:rotate-12' : 'bg-slate-200 dark:bg-white/5 text-slate-400'
              }`}>
                {profile.can_invite ? <Share2 size={32} /> : <Lock size={32} />}
              </div>
              <div className="text-left">
                <p className={`text-lg font-sans  uppercase tracking-tighter leading-none mb-1 ${
                  profile.can_invite ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {profile.can_invite ? (labels.inviteTitle + ' 🌹') : 'Devenir Ambassadeur'}
                </p>
                <p className={`text-sm font-bold ${
                  profile.can_invite ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-600'
                }`}>
                  {profile.can_invite
                    ? labels.inviteSubtitle
                    : 'Programme sur invitation uniquement'}
                </p>
              </div>
            </div>
            {profile.can_invite ? (
              <div className="bg-white/10 p-3 rounded-full group-hover:bg-primary transition-colors relative z-10">
                <ChevronRight size={24} />
              </div>
            ) : (
              <div className="bg-slate-200 dark:bg-white/5 p-3 rounded-full text-slate-300 dark:text-slate-700 relative z-10">
                <Lock size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Menu & Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/10 transition-colors flex flex-col gap-2">
            {/* Action Item: Goal */}
            <button
              onClick={() => setIsGoalOpen(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-primary rounded-xl flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
                <Heart size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold tracking-tighter text-slate-900 dark:text-white uppercase">{labels.goal}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {getRelationshipGoalLabel(profile.relationship_goal, language)}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-200 dark:text-slate-700" />
            </button>

            {/* Action Item: Passport */}
            <button
              onClick={() => setIsPassportOpen(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
                <Plane size={24} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold tracking-tighter text-slate-900 dark:text-white uppercase">{labels.travelMode}</p>
                <p className="text-[10px] font-bold text-slate-400">
                  {profile.passport_city ? profile.passport_city : labels.changeCity}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-200 dark:text-slate-700" />
            </button>

            {/* Action Item: Verify (KYC) */}
            {!profile.is_verified && (
              <button
                onClick={() => navigate('/verify')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 dark:shadow-none">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-sans  tracking-tighter text-blue-900 dark:text-blue-400 uppercase">{labels.certification}</p>
                  <p className="text-[10px] font-bold text-blue-400">{t('become_certified_member')}</p>
                </div>
                <ChevronRight size={16} className="text-blue-200" />
              </button>
            )}

            {/* Action Item: Invisible */}
            <button
              onClick={handleToggleInvisible}
              disabled={isTogglingInvisible}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all text-left group ${
                profile.is_invisible ? 'bg-teal-50/50 dark:bg-teal-900/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                profile.is_invisible ? 'bg-teal-500 text-white shadow-lg shadow-teal-100 dark:shadow-none' : 'bg-slate-50 dark:bg-white/5 text-slate-300 dark:text-slate-700 group-hover:bg-slate-100 dark:group-hover:bg-white/10'
              }`}>
                {profile.is_invisible ? <EyeOff size={24} /> : <Eye size={24} />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-sans  tracking-tighter uppercase ${profile.is_invisible ? 'text-teal-900 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>
                  {t('invisible_mode')}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {profile.is_invisible ? t('currently_hidden') : t('become_discreet')}
                </p>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${profile.is_invisible ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${profile.is_invisible ? 'left-6' : 'left-1'}`}></div>
              </div>
            </button>

            <div className="h-[1px] bg-slate-50 dark:bg-white/5 mx-4 my-2"></div>

            {/* General Menu Items */}
            <button
              onClick={() => navigate('/notifications', { state: { from: '/profile' } })}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group"
            >
              <div className="relative w-12 h-12 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors">
                <Bell size={20} />
                {notificationUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white">
                    {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                  </span>
                )}
              </div>
              <p className="flex-1 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{t('notifications')}</p>
              <ChevronRight size={16} className="text-slate-200 dark:text-slate-700" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors">
                <Settings size={20} />
              </div>
              <p className="flex-1 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{t('settings') || 'Paramètres'}</p>
            </button>

          </div>

          <button
            onClick={() => logout()}
            className="w-full py-5 rounded-[2rem] border-2 border-slate-100 dark:border-white/10 text-slate-300 dark:text-slate-700 font-medium text-xs uppercase tracking-prestige flex items-center justify-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-primary hover:border-primary/10 transition-all group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {t('logout')}
          </button>
        </div>
      </div>

      <PassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
        exportingData={exportingData}
        deletingAccount={deletingAccount}
      />

      <GoalModal
        isOpen={isGoalOpen}
        onClose={() => setIsGoalOpen(false)}
        currentGoalId={profile.relationship_goal || ''}
        onUpdateGoal={handleUpdateGoal}
      />
    </div>
  );
};

export default ProfilePage;
