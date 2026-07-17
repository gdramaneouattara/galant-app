import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { Heart, ShieldCheck, MapPin, MessageCircle, Lock, Star } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { Link, useNavigate } from 'react-router-dom';

interface LikeInboxRow {
  liker_id: string;
  created_at: string;
  liked_back?: boolean;
  is_matched?: boolean;
  user: {
    id: string;
    name: string;
    age: number;
    city: string | null;
    photos: string[];
    is_verified: boolean;
    is_premium: boolean;
    bio?: string;
  };
}

const LikesInboxPage: React.FC = () => {
  const { user, profile, t } = useAuth();
  const [likes, setLikes] = useState<LikeInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const isFemaleFreePlan = profile?.gender === 'FEMALE' && !profile?.is_premium;
  const canAccess = profile?.is_premium || isFemaleFreePlan;

  const fetchLikes = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await apiRequest<LikeInboxRow[]>('/api/likes/received', { requireAuth: true });
      setLikes(data || []);
    } catch (error) {
      console.error('Error fetching likes:', error);
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    if (user) fetchLikes();
  }, [user, fetchLikes]);

  const handleLikeBack = async (row: LikeInboxRow) => {
    if (likingId || row.liked_back || row.is_matched) return;
    setLikingId(row.user.id);
    try {
      const res = await apiRequest<{ matched?: boolean }>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: row.user.id, direction: 'RIGHT' }),
      });

      setLikes(prev => prev.map(item => item.user.id === row.user.id ? { ...item, liked_back: true, is_matched: !!res.matched } : item));

      if (res.matched) {
        showAlert(t('match_title'), t('match_sub', { name: row.user.name }));
      }
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setLikingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  if (!canAccess) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10">
        <div className="w-24 h-24 bg-rose-50 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
          <Lock size={48} />
        </div>
        <h2 className="text-3xl font-black mb-4 italic">{t('rose_box')}</h2>
        <p className="text-slate-500 mb-10 font-medium leading-relaxed">
          Découvrez qui a eu un coup de cœur pour vous. Cette fonctionnalité est réservée à nos membres Premium.
        </p>
        <Link to="/premium" className="block w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-lg shadow-red-200">
          {t('become_premium')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <div>
        <h2 className="text-3xl font-black italic">{t('rose_box')}</h2>
        <p className="text-slate-500 font-medium">Profils qui vous ont envoyé un like</p>
      </div>

      {likes.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <Heart size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">Aucun like reçu pour le moment. Soyez plus actif !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {likes.map((row) => (
            <div key={row.liker_id} className="bg-white p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 flex gap-4 items-center">
              <div className="relative w-24 h-32 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                <img src={row.user.photos?.[0]} className="w-full h-full object-cover" alt="" />
                {row.user.is_premium && (
                  <div className="absolute top-2 right-2 bg-accent text-white p-1 rounded-full shadow-sm">
                    <Star size={10} fill="currentColor" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 text-lg truncate">{row.user.name}, {row.user.age}</span>
                  {row.user.is_verified && <ShieldCheck size={16} className="text-blue-500" />}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase mb-3">
                  <MapPin size={12} />
                  <span>{row.user.city || t('city_not_set')}</span>
                </div>

                <div className="flex gap-2">
                  {row.is_matched ? (
                    <button
                      onClick={() => navigate('/matches')}
                      className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} />
                      Discuter
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLikeBack(row)}
                      disabled={likingId === row.user.id || row.liked_back}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        row.liked_back
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : 'bg-primary text-white shadow-lg shadow-red-100 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {likingId === row.user.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Heart size={14} fill={row.liked_back ? 'none' : 'currentColor'} />
                          {row.liked_back ? 'Like envoyé' : 'Liker en retour'}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/profile/${row.user.id}`, { state: { profile: row.user } })}
                    className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import { ChevronRight } from 'lucide-react';
export default LikesInboxPage;
