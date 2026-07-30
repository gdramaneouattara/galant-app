import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Plus, Heart, X, Play, Film, Lock, Share2, Users, Crown, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { fbStorage } from '../firebase';
import { showAlert } from '@shared/lib/ui-bridge';
import { compressImageWeb } from '../lib/imageCompression';
import StatusLikersModal from '../components/StatusLikersModal';
import StoryPurchaseModal from '../components/StoryPurchaseModal';
import LikerProfileModal, { type StatusLiker } from '../components/LikerProfileModal';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import { useSubscription } from '@shared/hooks/useSubscription';

interface Status {
  id: string;
  user_id: string;
  content: string;
  media_url: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  created_at: string;
  likes_count?: number;
  liked_by_me?: boolean;
  profiles: {
    id?: string;
    name: string;
    photos: string[];
    is_premium?: boolean;
  };
}

const StoriesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { initialStatusId?: string; openComposer?: boolean } | null;
  const { handleSwipe } = useMatchmaking();
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();

  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
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
  const initialActionHandledRef = useRef(false);

  const canPublishForFree = !!profile?.is_premium || !!profile?.is_vip;
  const canPublishNow = canPublishForFree || storyUploadUnlocked;

  const resolveMediaUrls = useCallback((items: Status[]) => {
    items.forEach((status) => {
      if (!status.media_url) return;
      setResolvedUrls((prev) => {
        if (prev[status.media_url]) return prev;
        getDownloadURL(ref(fbStorage, `statuses/${status.media_url}`))
          .then((url) => {
            setResolvedUrls((current) => current[status.media_url] ? current : { ...current, [status.media_url]: url });
          })
          .catch(() => {});
        return prev;
      });
    });
  }, []);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiRequest<Status[]>('/api/statuses', { requireAuth: true });
      const nextStatuses = data || [];
      setStatuses(nextStatuses);
      setLocked(false);
      resolveMediaUrls(nextStatuses);
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('subscription_required')) {
        setLocked(true);
        setStatuses([]);
      }
    } finally {
      setLoading(false);
    }
  }, [resolveMediaUrls]);

  useEffect(() => {
    if (user) void fetchStatuses();
  }, [user, fetchStatuses]);

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
      const objectUrl = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(video.duration);
        };
        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('invalid_video'));
        };
        video.src = objectUrl;
      }).catch(() => null);

      if (!duration) {
        showAlert('Erreur', "Impossible de lire cette video.");
        e.target.value = '';
        return;
      }

      if (duration > 16) {
        showAlert('Video trop longue', "Les stories sont limitees a 15 secondes. Veuillez raccourcir votre video avant de l'envoyer.");
        e.target.value = '';
        return;
      }
    }

    setUploading(true);

    try {
      let mediaUrl = '';

      if (type === 'VIDEO') {
        const formData = new FormData();
        formData.append('video', file);

        const res = await apiRequest<{ mediaUrl: string }>('/api/media/upload-video', {
          method: 'POST',
          requireAuth: true,
          body: formData,
        });
        mediaUrl = res.mediaUrl;
      } else {
        const compressedBlob = await compressImageWeb(file);
        const path = `${user.uid}/${Date.now()}.webp`;
        const storageRef = ref(fbStorage, `statuses/${path}`);
        await uploadBytes(storageRef, compressedBlob, { contentType: 'image/webp' });
        mediaUrl = path;
      }

      await apiRequest('/api/statuses', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ mediaUrl, type, content: '' }),
      });

      showAlert('Succes', 'Votre story a ete publiee !');
      setStoryUploadUnlocked(false);
      await fetchStatuses();
    } catch {
      showAlert('Erreur', "Impossible de publier la story.");
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
      await fetchStatuses();
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
      showAlert('Erreur', "Impossible de charger les likes de cette story.");
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
          showAlert('Match', `Vous et ${liker.profile.name} vous plaisez mutuellement.`);
        } else {
          showAlert('Succes', 'Like envoye.');
        }
      }
    } catch {
      showAlert('Erreur', 'Impossible de liker en retour.');
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
      showAlert('Succes', res?.matched ? 'Super Like envoye et match cree.' : 'Super Like envoye !');
      return;
    }

    try {
      const res = await apiRequest<{ matchId: string }>('/api/messages/direct-thread', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId }),
      });
      showAlert('Succes', 'Message direct debloque !');
      setSelectedLiker(null);
      setIsLikersOpen(false);
      navigate(`/chat/${res.matchId}`);
    } catch (error: any) {
      showAlert('Erreur', error?.message || 'Impossible d ouvrir cette discussion.');
    }
  };

  const handleStoryPurchase = async () => {
    const ok = await purchaseWithPaystack('STORY_UPLOAD', 500);
    if (ok) {
      setIsPurchaseOpen(false);
      setStoryUploadUnlocked(true);
      showAlert('Achat reussi', 'Vous pouvez maintenant publier votre story !');
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
        showAlert('Lien copie', 'Le lien de la story a ete copie.');
      }
    } catch {}
  };

  const handleDeleteStatus = async (status: Status) => {
    if (status.user_id !== user?.uid) return;
    if (!window.confirm('Supprimer cette story ?')) return;

    try {
      await apiRequest(`/api/statuses/${status.id}`, { method: 'DELETE', requireAuth: true });
      setSelectedStatusId(null);
      setStatuses((prev) => prev.filter((item) => item.id !== status.id));
      showAlert('Story supprimee', 'Votre story a ete retiree.');
    } catch (error: any) {
      showAlert('Erreur', error?.message || 'Impossible de supprimer la story.');
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
      <div className="max-w-md mx-auto text-center py-16 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 space-y-8">
        <div className="w-20 h-20 bg-rose-50 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
          <Lock size={40} />
        </div>
        <div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Stories exclusives</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Passez a Premium pour decouvrir les moments de vie de la communaute Galant et partager les votres.
          </p>
        </div>
        <Link to="/premium" className="block w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:scale-105 transition-all active:scale-95">
          Devenir Premium
        </Link>
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl sm:text-5xl font-serif italic tracking-tighter text-slate-900 leading-none mb-3">
            Galant <span className="text-primary italic">Stories</span>
          </h2>
          <p className="text-slate-400 font-medium uppercase tracking-prestige text-sm">
            Les moments de la communaute
          </p>
        </div>

        <button
          type="button"
          onClick={() => void openStoryPicker()}
          disabled={uploading}
          className="bg-slate-900 text-white px-6 sm:px-8 py-4 rounded-2xl shadow-2xl shadow-slate-900/20 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 font-medium text-xs uppercase tracking-prestige disabled:opacity-60"
        >
          {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
          Partager un moment
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => void openStoryPicker()}
          disabled={uploading}
          className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-rose-50/30 transition-all group disabled:opacity-60"
        >
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            {uploading ? <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /> : <Plus size={28} />}
          </div>
          <p className="text-[10px] font-medium uppercase tracking-prestige text-slate-400 group-hover:text-primary transition-colors">Ma Story</p>
        </button>

        {statuses.map((status) => {
          const mediaUrl = resolvedUrls[status.media_url];
          return (
            <button
              type="button"
              key={status.id}
              onClick={() => setSelectedStatusId(status.id)}
              className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-slate-900 shadow-xl cursor-pointer group hover:scale-[1.02] transition-all border-4 border-white text-left"
            >
              {status.message_type === 'VIDEO' ? (
                <div className="w-full h-full relative bg-slate-900">
                  {mediaUrl ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                      muted
                      playsInline
                      preload="metadata"
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
              ) : mediaUrl ? (
                <img
                  src={mediaUrl}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3000ms]"
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Film size={48} className="text-white/10" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-20">
                <div className={`w-10 h-10 rounded-2xl border-2 p-0.5 ${status.profiles.is_premium ? 'border-amber-400' : 'border-primary'}`}>
                  <img src={status.profiles.photos?.[0] || 'https://placehold.co/100x100'} className="w-full h-full object-cover rounded-[0.8rem]" alt="" />
                </div>
              </div>

              <div className="absolute bottom-5 left-5 right-5 z-20">
                <p className="text-sm font-serif italic tracking-tighter text-white truncate">{status.profiles.name}</p>
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

      {selectedStatus && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
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
              <img src={resolvedUrls[selectedStatus.media_url]} className="w-full h-full object-cover" alt="" />
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
                  <img src={selectedStatus.profiles.photos?.[0] || 'https://placehold.co/100x100'} className="w-full h-full object-cover rounded-xl" alt="" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-serif italic tracking-tighter text-white text-base sm:text-lg truncate">{selectedStatus.profiles.name}</p>
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
                    aria-label="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="absolute bottom-8 sm:bottom-12 left-6 right-6 sm:left-10 sm:right-10 flex items-end gap-4 z-50">
              <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-5 min-w-0">
                <p className="text-white text-sm sm:text-base font-medium leading-relaxed italic">
                  {selectedStatus.content || "Vivre l'instant present avec elegance..."}
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
