import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { fbStorage } from '../firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Plus, Heart, X, Play, Image as ImageIcon, Film, Lock, ChevronLeft, MoreHorizontal, Sparkles, Send, Share2, Users } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { Link, useNavigate } from 'react-router-dom';
import { compressImageWeb } from '../lib/imageCompression';
import StatusLikersModal from '../components/StatusLikersModal';
import StoryPurchaseModal from '../components/StoryPurchaseModal';
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
  const { user, profile, t } = useAuth();
  const navigate = useNavigate();
  const { handleSwipe } = useMatchmaking();
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  // Likers Management
  const [isLikersOpen, setIsLikersOpen] = useState(false);
  const [likers, setLikers] = useState<any[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);

  // Purchase Management
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyTriggerRef = useRef<HTMLInputElement>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiRequest<Status[]>('/api/statuses', { requireAuth: true });
      setStatuses(data || []);
      setLocked(false);

      data?.forEach(async (s) => {
        if (s.media_url && !resolvedUrls[s.media_url]) {
          try {
            const url = await getDownloadURL(ref(fbStorage, `statuses/${s.media_url}`));
            setResolvedUrls(prev => ({ ...prev, [s.media_url]: url }));
          } catch (e) {}
        }
      });
    } catch (e: any) {
      if (String(e?.message || '').toLowerCase().includes('subscription_required')) {
        setLocked(true);
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedUrls]);

  useEffect(() => {
    if (user) fetchStatuses();
  }, [user, fetchStatuses]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.is_premium && !profile?.is_vip) {
      setIsPurchaseOpen(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !user) return;

    const type = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';

    if (type === 'VIDEO') {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const durationPromise = new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
      });

      video.src = URL.createObjectURL(file);
      const duration = await durationPromise;

      if (duration > 16) {
        showAlert('Vidéo trop longue', 'Les stories sont limitées à 15 secondes. Veuillez raccourcir votre vidéo avant de l\'envoyer.');
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
        body: JSON.stringify({ mediaUrl, type, content: '' })
      });

      showAlert('Succès', 'Votre story a été publiée !');
      fetchStatuses();
    } catch (error: any) {
      showAlert('Erreur', "Impossible de publier la story.");
    } finally {
      setUploading(false);
    }
  };

  const toggleLike = async (status: Status) => {
    if (!user || status.user_id === user.uid) return;
    const currentlyLiked = !!status.liked_by_me;

    setStatuses(prev => prev.map(s => s.id === status.id ? {
      ...s,
      liked_by_me: !currentlyLiked,
      likes_count: (s.likes_count || 0) + (currentlyLiked ? -1 : 1)
    } : s));

    try {
      await apiRequest(`/api/statuses/${status.id}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
        requireAuth: true
      });
    } catch (e) {
      fetchStatuses();
    }
  };

  const handleOpenLikers = async (status: Status) => {
    setIsLikersOpen(true);
    setLikersLoading(true);
    try {
      const data = await apiRequest<{ likes: any[] }>(`/api/statuses/${status.id}/likes`, { requireAuth: true });
      setLikers(data.likes || []);
    } catch (e) {
      setLikers([]);
    } finally {
      setLikersLoading(false);
    }
  };

  const handleLikeBack = async (liker: any) => {
    try {
      const res = await handleSwipe(liker.user_id, 'RIGHT');
      if (res?.matched) {
        showAlert('Match 🎉', `Vous et ${liker.profile.name} vous plaisez !`);
        setIsLikersOpen(false);
        navigate('/matches');
      } else {
        setLikers(prev => prev.map(l => l.user_id === liker.user_id ? { ...l, is_matched: true } : l));
      }
    } catch (e) {
      showAlert('Erreur', 'Impossible de liker en retour.');
    }
  };

  const handlePurchase = async () => {
    const ok = await purchaseWithPaystack('STORY_UPLOAD', 500);
    if (ok) {
      setIsPurchaseOpen(false);
      showAlert('Achat réussi', 'Vous pouvez maintenant publier votre story !');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-40">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="text-primary/20" size={24} />
        </div>
      </div>
    </div>
  );

  if (locked) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 p-12 space-y-8">
        <div className="w-24 h-24 bg-gradient-to-br from-rose-50 to-rose-100 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
          <Lock size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black mb-2 tracking-tight italic">Stories Exclusives</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Passez à Premium pour découvrir les moments de vie de la communauté Galant et partager les vôtres.
          </p>
        </div>
        <Link to="/premium" className="block w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:scale-105 transition-all active:scale-95">
          Devenir Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-none mb-3">
            Status <span className="text-primary italic">Galant</span>
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
            Les éclats de vie de la communauté
          </p>
        </div>

        <label className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-slate-900/20 cursor-pointer hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest group">
          {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Plus size={20} className="group-hover:rotate-90 transition-transform" />}
          Partager un moment
          <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {/* Your Story Trigger */}
        <label className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-rose-50/30 transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Plus size={28} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">Ma Story</p>
          <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
        </label>

        {statuses.map((status) => (
          <div
            key={status.id}
            onClick={() => setSelectedStatus(status)}
            className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-xl cursor-pointer group hover:scale-[1.02] transition-all border-4 border-white"
          >
            {status.message_type === 'VIDEO' ? (
              <div className="w-full h-full relative">
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                  <Play className="text-white opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" size={40} fill="white" />
                </div>
                {/* Thumbnail placeholder if needed */}
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                   <Film size={48} className="text-white/10" />
                </div>
              </div>
            ) : (
              <img
                src={resolvedUrls[status.media_url]}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3000ms]"
                alt=""
                loading="lazy"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

            {/* Profile Info in Grid */}
            <div className="absolute top-4 left-4 right-4 flex items-center gap-2 z-20">
              <div className={`w-10 h-10 rounded-2xl border-2 p-0.5 ${status.profiles.is_premium ? 'border-amber-400' : 'border-primary'}`}>
                <img src={status.profiles.photos?.[0]} className="w-full h-full object-cover rounded-[0.8rem]" alt="" />
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 z-20">
              <p className="text-sm font-black text-white truncate shadow-sm">{status.profiles.name}</p>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1">Il y a 2h</p>
            </div>

            {status.likes_count ? (
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-white/10">
                <Heart size={12} className="text-primary fill-primary" />
                <span className="text-[10px] font-black text-white">{status.likes_count}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Modern Story Viewer */}
      {selectedStatus && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300">
          <button
            onClick={() => setSelectedStatus(null)}
            className="absolute top-10 right-10 text-white/30 hover:text-white transition-all z-[110] hover:rotate-90"
          >
            <X size={48} />
          </button>

          <div className="relative w-full max-w-lg h-full md:h-[90vh] bg-black rounded-none md:rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-8 border-white/10">
            {selectedStatus.message_type === 'VIDEO' ? (
              <video
                src={resolvedUrls[selectedStatus.media_url]}
                autoPlay
                loop
                className="w-full h-full object-cover"
                controls={false}
              />
            ) : (
              <img src={resolvedUrls[selectedStatus.media_url]} className="w-full h-full object-cover" alt="" />
            )}

            {/* Progress Bars (Mock) */}
            <div className="absolute top-6 left-10 right-10 flex gap-1.5 z-50">
              <div className="h-1 flex-1 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-primary w-2/3"></div>
              </div>
              <div className="h-1 flex-1 bg-white/20 rounded-full"></div>
              <div className="h-1 flex-1 bg-white/20 rounded-full"></div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

            <div className="absolute top-12 left-10 right-10 flex justify-between items-center z-50">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl border-2 p-0.5 ${selectedStatus.profiles.is_premium ? 'border-amber-400' : 'border-primary shadow-lg shadow-red-500/20'}`}>
                  <img src={selectedStatus.profiles.photos?.[0]} className="w-full h-full object-cover rounded-xl" alt="" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-white text-lg tracking-tight">{selectedStatus.profiles.name}</p>
                    {selectedStatus.profiles.is_premium && <Crown size={14} className="text-amber-400" fill="currentColor" />}
                  </div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-0.5">
                    {new Date(selectedStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {selectedStatus.user_id === user?.uid && (
                <button
                  onClick={() => handleOpenLikers(selectedStatus)}
                  className="bg-white/10 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 text-white hover:bg-white/20 transition-all"
                >
                  <Users size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {selectedStatus.likes_count || 0} Admirateurs
                  </span>
                </button>
              )}
            </div>

            <div className="absolute bottom-12 left-10 right-10 flex items-center gap-6 z-50">
               <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                 <p className="text-white text-base font-medium leading-relaxed italic">
                   {selectedStatus.content || "Vivre l'instant présent avec élégance... ✨"}
                 </p>
               </div>

               <div className="flex flex-col gap-4">
                 <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(selectedStatus); }}
                  className={`w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center transition-all shadow-2xl ${selectedStatus.liked_by_me ? 'bg-primary text-white scale-110' : 'bg-white/10 text-white backdrop-blur-xl border border-white/10 hover:bg-white/20'}`}
                 >
                   <Heart size={32} fill={selectedStatus.liked_by_me ? 'white' : 'none'} className={selectedStatus.liked_by_me ? 'animate-bounce' : ''} />
                   {selectedStatus.likes_count ? <span className="text-[10px] font-black mt-1">{selectedStatus.likes_count}</span> : null}
                 </button>

                 <button className="w-16 h-16 rounded-[1.5rem] bg-white/10 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-2xl">
                   <Share2 size={28} />
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
        onLikeBack={handleLikeBack}
        onDirectMessage={(liker) => navigate(`/chat/${liker.user_id}`)}
      />

      <StoryPurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        onPurchase={handlePurchase}
        loading={purchaseLoading}
      />
    </div>
  );
};

export default StoriesPage;
