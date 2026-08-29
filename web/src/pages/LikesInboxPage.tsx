import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { Heart, ShieldCheck, MapPin, MessageCircle, Lock, Star, ChevronLeft, CreditCard } from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';
import { Link, useNavigate } from 'react-router-dom';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';
import ProfileFacts from '../components/ProfileFacts';

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
    country?: string | null;
    gender?: string | null;
    relationship_goal?: string | null;
    religion?: string | null;
    religion_other?: string | null;
    photos: string[];
    photo_variants?: Record<string, { thumb?: string; medium?: string; full?: string }>;
    is_verified: boolean;
    is_premium: boolean;
    bio?: string;
  };
}

const LikesInboxPage: React.FC = () => {
  const { user, profile, t, reloadUser, language } = useAuth();
  const [likes, setLikes] = useState<LikeInboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const navigate = useNavigate();

  const isFemaleFreePlan = profile?.gender === 'FEMALE' && !profile?.is_premium;
  const isTemporarilyUnlocked = profile?.likes_unlocked_until && new Date(profile.likes_unlocked_until) > new Date();
  const canAccess = profile?.is_premium || isFemaleFreePlan || isTemporarilyUnlocked;
  const labels = language === 'en'
    ? {
        unlock2h: '2h access (1,000 F)',
        empty: 'No likes received yet. Be more active!',
        chat: 'Chat',
        liked: 'Like sent',
        likeBack: 'Like back'
      }
    : {
        unlock2h: 'Accès 2h (1 000 F)',
        empty: 'Aucun like reçu pour le moment. Soyez plus actif !',
        chat: 'Discuter',
        liked: 'Like envoye',
        likeBack: 'Liker en retour'
      };

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
      showAlert(t('error'), error.message);
    } finally {
      setLikingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  if (!canAccess) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5 p-10 space-y-8">
        <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-primary rounded-full flex items-center justify-center mx-auto">
          <Lock size={48} />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black  dark:text-white transition-colors">{t('likes_received')}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors">
            {t('likes_received_locked_desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4">
          <Link to="/store" className="block w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95">
            {t('become_premium')}
          </Link>

          <button
            onClick={() => setIsUnlockModalOpen(true)}
            className="w-full py-5 rounded-2xl border-2 border-slate-100 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            <CreditCard size={18} />
            {labels.unlock2h}
          </button>
        </div>

        <InteractionPurchaseModal
          isOpen={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          type="LIKES_INBOX_2H"
          onSuccess={async () => {
            await reloadUser();
            setIsUnlockModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black  dark:text-white">{t('likes_received')}</h2>
          <p className="text-slate-500 font-medium">{t('likes_received_desc')}</p>
        </div>
      </div>

      {likes.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5 transition-colors">
          <Heart size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4 transition-colors" />
          <p className="text-slate-400 dark:text-slate-500 font-bold transition-colors">{labels.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {likes.map((row) => (
            <div key={row.liker_id} className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-white/5 flex gap-4 items-center transition-colors">
              <div className="relative w-24 h-32 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                <OptimizedImage src={optimizedPhotoUrl(row.user.photos?.[0], row.user.photo_variants, 'thumb')} className="w-full h-full object-cover" alt="" />
                {row.user.is_premium && (
                  <div className="absolute top-2 right-2 bg-accent text-white p-1 rounded-full shadow-sm">
                    <Star size={10} fill="currentColor" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 dark:text-white text-lg truncate transition-colors">{row.user.name}, {row.user.age}</span>
                  {row.user.is_verified && <ShieldCheck size={16} className="text-blue-500" />}
                </div>
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase mb-3 transition-colors">
                  <MapPin size={12} />
                  <span>{row.user.city || t('city_not_set')}</span>
                </div>
                <ProfileFacts profile={row.user} language={language} className="mb-3" />

                <div className="flex gap-2">
                  {row.is_matched ? (
                    <button
                      onClick={() => navigate('/matches')}
                      className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle size={14} />
                      {labels.chat}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLikeBack(row)}
                      disabled={likingId === row.user.id || row.liked_back}
                      className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        row.liked_back
                          ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-default'
                          : 'bg-primary text-white shadow-lg shadow-red-100 dark:shadow-none hover:scale-105 active:scale-95'
                      }`}
                    >
                      {likingId === row.user.id ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Heart size={14} fill={row.liked_back ? 'none' : 'currentColor'} />
                          {row.liked_back ? labels.liked : labels.likeBack}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/profile/${row.user.id}`, { state: { profile: row.user } })}
                    className="p-2.5 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
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
