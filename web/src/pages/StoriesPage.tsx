import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { fbStorage } from '../firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { Plus, Heart, X, Play, Image as ImageIcon, Film, Lock, ChevronLeft, MoreHorizontal } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { Link } from 'react-router-dom';
import { compressImageWeb } from '../lib/imageCompression';

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
  };
}

const StoriesPage: React.FC = () => {
  const { user, profile, t } = useAuth();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await apiRequest<Status[]>('/api/statuses', { requireAuth: true });
      setStatuses(data || []);
      setLocked(false);

      // Résolution asynchrone des URLs Storage
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
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const type = file.type.startsWith('video') ? 'VIDEO' : 'IMAGE';

    // Vérification de la durée pour les vidéos sur le Web avec arrêt bloquant
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

      if (duration > 16) { // On laisse 1s de marge
        showAlert('Vidéo trop longue', 'Les stories sont limitées à 15 secondes. Veuillez raccourcir votre vidéo avant de l\'envoyer.');
        e.target.value = ''; // Réinitialise l'input
        return;
      }
    }

    setUploading(true);

    try {
      let mediaUrl = '';

      if (type === 'VIDEO') {
        // Envoi au serveur pour compression 720p
        const formData = new FormData();
        formData.append('video', file);

        const res = await apiRequest<{ mediaUrl: string }>('/api/media/upload-video', {
          method: 'POST',
          requireAuth: true,
          body: formData,
        });
        mediaUrl = res.mediaUrl;
      } else {
        // IMAGE: Compression locale WebP
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

    // UI Optimiste
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
      // Rollback
      fetchStatuses();
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (locked) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <Lock size={48} />
        </div>
        <h2 className="text-3xl font-black mb-4 italic">Stories Exclusives</h2>
        <p className="text-slate-500 mb-10 font-medium leading-relaxed">
          Passez à Premium pour découvrir les moments de vie de la communauté Galant.
        </p>
        <Link to="/premium" className="block w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-lg shadow-red-200">
          Devenir Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black italic">Galant Status</h2>
          <p className="text-slate-500 font-medium">Moments éphémères de la communauté</p>
        </div>
        <label className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-red-100 cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold text-sm">
          {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Plus size={20} />}
          PUBLIER
          <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statuses.map((status) => (
          <div
            key={status.id}
            onClick={() => setSelectedStatus(status)}
            className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-slate-200 shadow-lg cursor-pointer group hover:scale-[1.02] transition-all"
          >
            {status.message_type === 'VIDEO' ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900">
                <Film size={32} className="text-white/20" />
                <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 group-hover:opacity-100 transition-opacity" size={40} fill="white" />
              </div>
            ) : (
              <img src={resolvedUrls[status.media_url]} className="w-full h-full object-cover" alt="" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-primary overflow-hidden">
                <img src={status.profiles.photos?.[0]} className="w-full h-full object-cover" alt="" />
              </div>
              <span className="text-xs font-bold text-white truncate">{status.profiles.name}</span>
            </div>

            {status.likes_count ? (
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                <Heart size={10} className="text-primary fill-primary" />
                <span className="text-[10px] font-black text-white">{status.likes_count}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Modal de Visualisation (Version simplifiée pour le Web) */}
      {selectedStatus && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedStatus(null)}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
          >
            <X size={40} />
          </button>

          <div className="relative w-full max-w-sm aspect-[9/16] bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
            {selectedStatus.message_type === 'VIDEO' ? (
              <video
                src={resolvedUrls[selectedStatus.media_url]}
                autoPlay
                loop
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <img src={resolvedUrls[selectedStatus.media_url]} className="w-full h-full object-cover" alt="" />
            )}

            <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
                  <img src={selectedStatus.profiles.photos?.[0]} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="text-white">
                  <p className="font-black text-sm">{selectedStatus.profiles.name}</p>
                  <p className="text-[10px] font-bold opacity-60 uppercase">{new Date(selectedStatus.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
               <div className="flex-1 mr-4">
                 <p className="text-white text-sm font-medium">{selectedStatus.content}</p>
               </div>
               <button
                onClick={(e) => { e.stopPropagation(); toggleLike(selectedStatus); }}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${selectedStatus.liked_by_me ? 'bg-primary text-white' : 'bg-white/10 text-white backdrop-blur-md'}`}
               >
                 <Heart size={28} fill={selectedStatus.liked_by_me ? 'white' : 'none'} />
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesPage;
