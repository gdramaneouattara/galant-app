import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ref, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Heart, X, Play, Film, Lock, Share2, Users, Crown, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { fbStorage } from '../firebase';
import { showAlert } from '@shared/lib/ui-bridge';
import { compressVideoWeb, STORY_VIDEO_MAX_DURATION_SECONDS, validateVideoFileWeb, VIDEO_UPLOAD_MAX_BYTES } from '../lib/videoOptimization';
import { uploadImageVariantsWeb } from '../lib/imageUploadVariants';
import StatusLikersModal from '../components/StatusLikersModal';
import StoryPurchaseModal from '../components/StoryPurchaseModal';
import LikerProfileModal, { type StatusLiker } from '../components/LikerProfileModal';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import { useSubscription } from '@shared/hooks/useSubscription';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const STORY_PAGE_SIZE = 10;

interface Status {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  thumbnail_url?: string | null;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  created_at: string;
  likes_count?: number;
  liked_by_me?: boolean;
  profiles: {
    id?: string;
    name: string;
    photos: string[];
    photo_variants?: Record<string, { thumb?: string; medium?: string; full?: string }>;
    is_premium?: boolean;
  };
}

type StatusesPageResponse = Status[] | {
  statuses?: Status[];
  hasMore?: boolean;
  nextOffset?: number;
};

const StoriesPage: React.FC = () => {
  const { user, profile, t, language } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { initialStatusId?: string; openComposer?: boolean } | null;
  const { handleSwipe } = useMatchmaking();
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreStories, setHasMoreStories] = useState(false);
  const [locked, setLocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [likeLoadingByStatusId, setLikeLoadingByStatusId] = useState<Record<string, boolean>>({});

  const [isLikersOpen, setIsLikersOpen] = useState(false);
  const [likers, setLikers] = useState<StatusLiker[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);
  const [selectedLiker, setSelectedLiker] = useState<StatusLiker | null>(null);
  const [likingBackUserId, setLikingBackUserId] = useState<string | null>(null);
  const [purchaseAction, setPurchaseAction] = useState<{ isOpen: boolean; type: 'SUPER_LIKE' | 'DIRECT_MESSAGE' }>({
    isOpen: false,
    type: 'SUPER_LIKE',
  });

  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [storyUploadUnlocked, setStoryUploadUnlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const nextStatusesOffsetRef = useRef(0);
  const initialActionHandledRef = useRef(false);

  const canPublishForFree = !!profile?.is_premium || !!profile?.is_vip;
  const canPublishNow = canPublishForFree || storyUploadUnlocked;
  const labels = language === 'en'
    ? {
        title: 'Galant Stories',
        subtitle: 'Community moments',
        share: 'Share a moment',
        back: 'Back',
        lockedTitle: 'Stories are reserved',
        lockedBody: 'Stories viewing is reserved for Premium members. Free accounts can publish one story and view up to 10 stories with a one-time 500 F payment.',
        unlockStory: 'Publish one Story - 500 F',
        loadMore: 'Load more stories',
        loadingMore: 'Loading stories...',
        premium: 'Become Premium',
        myStory: 'My story',
      }
    : {
        title: 'Galant Stories',
        subtitle: 'Les moments de la communauté',
        share: 'Partager un moment',
        back: 'Retour',
        lockedTitle: 'Stories réservées',
        lockedBody: 'La consultation des Stories est réservée aux membres Premium. Les comptes gratuits peuvent publier une story et consulter 10 stories maximum avec un paiement ponctuel de 500 F.',
        unlockStory: 'Publier une Story - 500 F',
        loadMore: 'Charger plus de stories',
        loadingMore: 'Chargement des stories...',
        premium: 'Devenir Premium',
        myStory: 'Ma story',
      };

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const resolveMediaUrls = useCallback((items: Status[]) => {
    items.forEach((status) => {
      [status.media_url, status.thumbnail_url].filter(Boolean).forEach((mediaPath) => {
        const path = String(mediaPath);
        setResolvedUrls((prev) => {
          if (prev[path]) return prev;
          getDownloadURL(ref(fbStorage, `statuses/${path}`))
            .then((url) => {
              setResolvedUrls((current) => current[path] ? current : { ...current, [path]: url });
            })
            .catch(() => {});
          return prev;
        });
      });
    });
  }, []);

  const fetchStatuses = useCallback(async ({ append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const offset = append ? nextStatusesOffsetRef.current : 0;
      const data = await apiRequest<StatusesPageResponse>(`/api/statuses?limit=${STORY_PAGE_SIZE}&offset=${offset}&pageInfo=true`, { requireAuth: true });
      const isPagedResponse = !Array.isArray(data);
      const nextStatuses = Array.isArray(data) ? data : (data.statuses || []);
      nextStatusesOffsetRef.current = isPagedResponse && typeof data.nextOffset === 'number'
        ? data.nextOffset
        : offset + nextStatuses.length;
      setStatuses((current) => {
        if (!append) return nextStatuses;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...nextStatuses.filter((item) => !seen.has(item.id))];
      });
      setHasMoreStories(isPagedResponse ? !!data.hasMore : nextStatuses.length === STORY_PAGE_SIZE);
      setLocked(false);
      resolveMediaUrls(nextStatuses);
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('subscription_required')) {
        setLocked(true);
        setStatuses([]);
        setHasMoreStories(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [resolveMediaUrls]);

  useEffect(() => {
    if (user) void fetchStatuses();
  }, [user, fetchStatuses]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMoreStories || loadingMore || selectedStatusId) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void fetchStatuses({ append: true });
      }
    }, { rootMargin: '240px 0px' });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchStatuses, hasMoreStories, loadingMore, selectedStatusId]);

  const refreshUploadAccess = useCallback(async () => {
    if (!user) return false;
    try {
      const access = await apiRequest<{ canPublish?: boolean; hasPurchasedUpload?: boolean }>('/api/statuses/upload-access', { requireAuth: true });
      setStoryUploadUnlocked(!!access.hasPurchasedUpload);
      return !!access.canPublish;
    } catch {
      return canPublishForFree;
    }
  }, [user, canPublishForFree]);

  useEffect(() => {
    if (user && !canPublishForFree) void refreshUploadAccess();
  }, [user, canPublishForFree, refreshUploadAccess]);

  const openStoryPicker = async () => {
    if (uploading) return;
    const canPublish = canPublishNow || await refreshUploadAccess();
    if (!canPublish) {
      setIsPurchaseOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (initialActionHandledRef.current || loading) return;
    if (routeState?.initialStatusId && statuses.some((status) => status.id === routeState.initialStatusId)) {
      initialActionHandledRef.current = true;
      setSelectedStatusId(routeState.initialStatusId);
      return;
    }
    if (routeState?.openComposer) {
      initialActionHandledRef.current = true;
      window.setTimeout(() => { void openStoryPicker(); }, 350);
    }
  }, [loading, routeState?.initialStatusId, routeState?.openComposer, statuses]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!canPublishNow) {
      setIsPurchaseOpen(true);
      e.target.value = '';
      return;
    }

    const type = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';

    if (type === 'VIDEO') {
      try {
        await validateVideoFileWeb(file, STORY_VIDEO_MAX_DURATION_SECONDS);
      } catch (error: any) {
        if (error?.message === 'video_too_large') {
          showAlert(t('video_too_heavy_title'), t('video_too_heavy'));
          e.target.value = '';
          return;
        }
        if (error?.message === 'video_too_long') {
          showAlert(t('video_too_long_title'), t('video_too_long_story'));
          e.target.value = '';
          return;
        }
        showAlert(t('error'), t('video_unreadable'));
        e.target.value = '';
        return;
      }
    }

    setUploading(true);

    try {
      let mediaUrl = '';
      let thumbnailUrl: string | null = null;

      if (type === 'VIDEO') {
        const optimizedVideo = await compressVideoWeb(file, {
          kind: 'STORY',
          maxDurationSeconds: STORY_VIDEO_MAX_DURATION_SECONDS,
        });
        if (optimizedVideo.size > VIDEO_UPLOAD_MAX_BYTES) {
          showAlert(t('video_too_heavy_title'), t('video_still_too_heavy'));
          return;
        }
        const formData = new FormData();
        formData.append('video', optimizedVideo, optimizedVideo.name || 'story.webm');

        const res = await apiRequest<{ mediaUrl: string; thumbnailUrl?: string }>('/api/media/upload-video', {
          method: 'POST',
          requireAuth: true,
          body: formData,
        });
        mediaUrl = res.mediaUrl;
        thumbnailUrl = res.thumbnailUrl || null;
      } else {
        const path = `${user.uid}/${Date.now()}.webp`;
        const uploaded = await uploadImageVariantsWeb(file, `statuses/${path}`);
        mediaUrl = path;
        thumbnailUrl = uploaded.paths.thumb.replace(/^statuses\//, '');
      }

      await apiRequest('/api/statuses', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ mediaUrl, thumbnailUrl, type, content: '' }),
      });

      showAlert(t('success'), t('story_published'));
      setStoryUploadUnlocked(false);
      await fetchStatuses({ append: false });
    } catch {
      showAlert(t('error'), t('story_publish_failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleLike = async (status: Status) => {
    if (!user || status.user_id === user.uid || likeLoadingByStatusId[status.id]) return;
    const currentlyLiked = !!status.liked_by_me;

    setStatuses((prev) => prev.map((s) => s.id === status.id ? {
      ...s,
      liked_by_me: !currentlyLiked,
      likes_count: Math.max(0, (s.likes_count || 0) + (currentlyLiked ? -1 : 1)),
    } : s));
    setLikeLoadingByStatusId((prev) => ({ ...prev, [status.id]: true }));

    try {
      await apiRequest(`/api/statuses/${status.id}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
        requireAuth: true,
      });
    } catch {
      await fetchStatuses({ append: false });
    } finally {
      setLikeLoadingByStatusId((prev) => {
        const next = { ...prev };
        delete next[status.id];
        return next;
      });
    }
  };

  const handleOpenLikers = async (status: Status) => {
    setIsLikersOpen(true);
    setLikersLoading(true);
    try {
      const data = await apiRequest<{ likes: StatusLiker[] }>(`/api/statuses/${status.id}/likes`, { requireAuth: true });
      setLikers(data.likes || []);
    } catch {
      setLikers([]);
      showAlert(t('error'), t('story_likes_load_failed'));
    } finally {
      setLikersLoading(false);
    }
  };

  const updateLikerState = (targetUserId: string, patch: Partial<StatusLiker>) => {
    setLikers((prev) => prev.map((entry) => entry.user_id === targetUserId ? { ...entry, ...patch } : entry));
    setSelectedLiker((current) => current?.user_id === targetUserId ? { ...current, ...patch } : current);
  };

  const handleLikeBack = async (liker: StatusLiker) => {
    const targetUserId = liker.profile?.id || liker.user_id;
    if (!targetUserId || targetUserId === user?.uid || likingBackUserId) return;

    try {
      setLikingBackUserId(targetUserId);
      const res = await handleSwipe(targetUserId, 'RIGHT');
      if (res) {
        updateLikerState(targetUserId, { liked_back: true, is_matched: !!res.matched });
        if (res.matched) {
          showAlert(t('match_title'), t('matched_with', { name: liker.profile.name }));
        } else {
          showAlert(t('success'), t('like_sent'));
        }
      }
    } catch {
      showAlert(t('error'), t('like_back_failed'));
    } finally {
      setLikingBackUserId(null);
    }
  };

  const handleInteractionSuccess = async () => {
    if (!selectedLiker) return;
    const targetUserId = selectedLiker.profile?.id || selectedLiker.user_id;

    if (purchaseAction.type === 'SUPER_LIKE') {
      const res = await handleSwipe(targetUserId, 'RIGHT', true);
      updateLikerState(targetUserId, { liked_back: true, is_matched: !!res?.matched });
      showAlert(t('success'), res?.matched ? t('super_like_sent_match') : t('super_like_sent'));
      return;
    }

    try {
      const res = await apiRequest<{ matchId: string }>('/api/messages/direct-thread', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId }),
      });
      showAlert(t('success'), t('direct_message_unlocked'));
      setSelectedLiker(null);
      setIsLikersOpen(false);
      navigate(`/chat/${res.matchId}`);
    } catch (error: any) {
      showAlert(t('error'), error?.message || t('open_chat_failed'));
    }
  };

  const handleStoryPurchase = async () => {
    const ok = await purchaseWithPaystack('STORY_UPLOAD', 500);
    if (ok) {
      setIsPurchaseOpen(false);
      setStoryUploadUnlocked(true);
      showAlert(t('purchase_success'), t('story_upload_unlocked'));
      await fetchStatuses({ append: false });
      window.setTimeout(() => fileInputRef.current?.click(), 600);
    }
  };

  const handleShare = async (status: Status) => {
    const url = resolvedUrls[status.media_url];
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Story Galant', url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showAlert(t('link_copied'), t('story_link_copied_body'));
      }
    } catch {}
  };

  const handleDeleteStatus = async (status: Status) => {
    if (status.user_id !== user?.uid) return;
    if (!window.confirm(t('story_delete_confirm'))) return;

    try {
      await apiRequest(`/api/statuses/${status.id}`, { method: 'DELETE', requireAuth: true });
      setSelectedStatusId(null);
      setStatuses((prev) => prev.filter((item) => item.id !== status.id));
      showAlert(t('success'), t('story_removed'));
    } catch (error: any) {
      showAlert(t('error'), error?.message || t('story_delete_failed'));
    }
  };

  const formatPublishedAt = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const selectedStatus = selectedStatusId ? statuses.find((s) => s.id === selectedStatusId) || null : null;

  if (loading) return (
    <div className="flex justify-center py-40">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="text-primary/20" size={24} />
        </div>
      </div>
    </div>
  );

  if (locked) {
    return (
      <div className="max-w-3xl mx-auto pb-20 px-4 space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          onChange={handleFileUpload}
          disabled={uploading}
        />

        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:text-primary"
          aria-label={labels.back}
        >
          <ArrowLeft size={18} />
          {labels.back}
        </button>

        <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl dark:shadow-none border border-slate-100 dark:border-white/10 p-8 space-y-8 transition-colors">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-red-500/10 dark:shadow-none transition-colors">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-2 tracking-tight text-slate-900 dark:text-white transition-colors">{labels.lockedTitle}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors">
              {labels.lockedBody}
            </p>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => void openStoryPicker()}
              disabled={uploading || purchaseLoading}
              className="block w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-60"
            >
              {uploading ? t('loading') : labels.unlockStory}
            </button>
            <Link to="/store" className="block w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:scale-[1.02] transition-all active:scale-95">
              {labels.premium}
            </Link>
          </div>
        </div>

        <StoryPurchaseModal
          isOpen={isPurchaseOpen}
          onClose={() => setIsPurchaseOpen(false)}
          onPurchase={handleStoryPurchase}
          loading={purchaseLoading}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 space-y-10">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={handleFileUpload}
        disabled={uploading}
      />

      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex w-fit items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:text-primary"
          aria-label={labels.back}
        >
          <ArrowLeft size={18} />
          {labels.back}
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
          <h2 className="text-4xl sm:text-5xl font-sans  tracking-tighter text-slate-900 dark:text-white leading-none mb-3 transition-colors">
            {labels.title.split(' ')[0]} <span className="text-primary ">{labels.title.split(' ').slice(1).join(' ') || 'Stories'}</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-medium uppercase tracking-prestige text-sm transition-colors">
            {labels.subtitle}
          </p>
          </div>

          <button
            type="button"
            onClick={() => void openStoryPicker()}
            disabled={uploading}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 sm:px-8 py-4 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-none hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 font-medium text-xs uppercase tracking-prestige disabled:opacity-60"
          >
            {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" /> : <Plus size={20} />}
            {labels.share}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => void openStoryPicker()}
          disabled={uploading}
          className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-all group disabled:opacity-60"
        >
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            {uploading ? <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <Plus size={28} />}
          </div>
          <p className="text-[10px] font-medium uppercase tracking-prestige text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">{labels.myStory}</p>
        </button>

        {statuses.map((status) => {
          const mediaUrl = resolvedUrls[status.media_url];
          const thumbnailUrl = status.thumbnail_url ? resolvedUrls[status.thumbnail_url] : null;
          return (
            <button
              type="button"
              key={status.id}
              onClick={() => setSelectedStatusId(status.id)}
              className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-slate-900 shadow-xl cursor-pointer group hover:scale-[1.02] transition-all border-4 border-white dark:border-slate-800 text-left"
            >
              {status.message_type === 'VIDEO' ? (
                <div className="w-full h-full relative bg-slate-900">
                  {thumbnailUrl ? (
                    <OptimizedImage
                      src={thumbnailUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <Film size={48} className="text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                    <Play className="text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" size={40} fill="white" />
                  </div>
                </div>
              ) : (thumbnailUrl || mediaUrl) ? (
                <OptimizedImage
                  src={thumbnailUrl || mediaUrl}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3000ms]"
                  alt=""
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Film size={48} className="text-white/10" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-20">
                <div className={`w-10 h-10 rounded-2xl border-2 p-0.5 ${status.profiles.is_premium ? 'border-amber-400' : 'border-primary'}`}>
                  <OptimizedImage
                    src={optimizedPhotoUrl(status.profiles.photos?.[0], status.profiles.photo_variants, 'thumb') || 'https://placehold.co/100x100'}
                    className="w-full h-full object-cover rounded-[0.8rem]"
                    alt=""
                  />
                </div>
              </div>

              <div className="absolute bottom-5 left-5 right-5 z-20">
                <p className="text-sm font-sans  tracking-tighter text-white truncate">{status.profiles.name}</p>
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">{formatPublishedAt(status.created_at)}</p>
              </div>

              {!!status.likes_count && (
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/10 z-20">
                  <Heart size={12} className="text-primary fill-primary" />
                  <span className="text-[10px] font-black text-white">{status.likes_count}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasMoreStories && (
        <div ref={loadMoreRef} className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void fetchStatuses({ append: true })}
            disabled={loadingMore}
            className="rounded-2xl border border-white/10 bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loadingMore ? labels.loadingMore : labels.loadMore}
          </button>
        </div>
      )}

      {selectedStatus && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
          <button
            onClick={() => setSelectedStatusId(null)}
            className="absolute top-6 left-6 md:top-10 md:left-10 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/70 backdrop-blur-xl border border-white/10 hover:text-white hover:bg-white/15 transition-all z-[110]"
            aria-label={labels.back}
          >
            <ArrowLeft size={20} />
            {labels.back}
          </button>

          <button
            onClick={() => setSelectedStatusId(null)}
            className="absolute top-6 right-6 md:top-10 md:right-10 text-white/50 hover:text-white transition-all z-[110]"
            aria-label="Fermer"
          >
            <X size={42} />
          </button>

          <div className="relative w-full max-w-lg h-full md:h-[90vh] bg-black rounded-none md:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-8 border-white/10">
            {selectedStatus.message_type === 'VIDEO' ? (
              <video
                src={resolvedUrls[selectedStatus.media_url]}
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
                controls={false}
              />
            ) : (
              <OptimizedImage src={resolvedUrls[selectedStatus.media_url]} className="w-full h-full object-cover" alt="" eager />
            )}

            <div className="absolute top-6 left-8 right-8 flex gap-1.5 z-50">
              <div className="h-1 flex-1 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-primary w-2/3" />
              </div>
              <div className="h-1 flex-1 bg-white/20 rounded-full" />
              <div className="h-1 flex-1 bg-white/20 rounded-full" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            <div className="absolute top-12 left-6 right-6 sm:left-10 sm:right-10 flex justify-between items-center gap-3 z-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 p-0.5 flex-shrink-0 ${selectedStatus.profiles.is_premium ? 'border-amber-400' : 'border-primary shadow-lg shadow-red-500/20'}`}>
                  <OptimizedImage src={optimizedPhotoUrl(selectedStatus.profiles.photos?.[0], selectedStatus.profiles.photo_variants, 'thumb') || 'https://placehold.co/100x100'} className="w-full h-full object-cover rounded-xl" alt="" eager />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-sans  tracking-tighter text-white text-base sm:text-lg truncate">{selectedStatus.profiles.name}</p>
                    {selectedStatus.profiles.is_premium && <Crown size={14} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
                  </div>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-prestige mt-0.5">
                    {formatPublishedAt(selectedStatus.created_at)}
                  </p>
                </div>
              </div>

              {selectedStatus.user_id === user?.uid && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                    onClick={() => handleOpenLikers(selectedStatus)}
                    className="bg-white/10 backdrop-blur-xl border border-white/10 px-3 sm:px-5 py-3 rounded-2xl flex items-center gap-2 text-white hover:bg-white/20 transition-all"
                  >
                    <Users size={18} />
                    <span className="text-[10px] sm:text-xs font-medium uppercase tracking-prestige">
                      {selectedStatus.likes_count || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => void handleDeleteStatus(selectedStatus)}
                    className="bg-red-500/20 backdrop-blur-xl border border-red-400/20 p-3 rounded-2xl text-white hover:bg-red-500/40 transition-all"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="absolute bottom-8 sm:bottom-12 left-6 right-6 sm:left-10 sm:right-10 flex items-end gap-4 z-50">
              <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5 min-w-0">
                <p className="text-white text-sm sm:text-base font-medium leading-relaxed ">
                  {selectedStatus.content || "Vivre l'instant présent avec élégance..."}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); void toggleLike(selectedStatus); }}
                  disabled={!!likeLoadingByStatusId[selectedStatus.id]}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all shadow-2xl disabled:opacity-70 ${selectedStatus.liked_by_me ? 'bg-primary text-white scale-105' : 'bg-white/10 text-white backdrop-blur-xl border border-white/10 hover:bg-white/20'}`}
                >
                  <Heart size={28} fill={selectedStatus.liked_by_me ? 'white' : 'none'} />
                  {!!selectedStatus.likes_count && <span className="text-[10px] font-black mt-1">{selectedStatus.likes_count}</span>}
                </button>

                <button
                  onClick={() => void handleShare(selectedStatus)}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-2xl"
                  aria-label="Partager"
                >
                  <Share2 size={26} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StatusLikersModal
        isOpen={isLikersOpen}
        onClose={() => setIsLikersOpen(false)}
        likers={likers}
        loading={likersLoading}
        onOpenProfile={(liker) => setSelectedLiker(liker)}
        onLikeBack={handleLikeBack}
        likingBackUserId={likingBackUserId}
        formatDate={formatPublishedAt}
      />

      <LikerProfileModal
        isOpen={!!selectedLiker}
        onClose={() => setSelectedLiker(null)}
        liker={selectedLiker}
        onLikeBack={handleLikeBack}
        onSuperLike={() => setPurchaseAction({ isOpen: true, type: 'SUPER_LIKE' })}
        onDirectMessage={() => setPurchaseAction({ isOpen: true, type: 'DIRECT_MESSAGE' })}
        likingBackUserId={likingBackUserId}
      />

      <InteractionPurchaseModal
        isOpen={purchaseAction.isOpen}
        onClose={() => setPurchaseAction((prev) => ({ ...prev, isOpen: false }))}
        type={purchaseAction.type}
        targetId={selectedLiker?.user_id}
        userName={selectedLiker?.profile.name}
        onSuccess={handleInteractionSuccess}
      />

      <StoryPurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        onPurchase={handleStoryPurchase}
        loading={purchaseLoading}
      />
    </div>
  );
};

export default StoriesPage;
