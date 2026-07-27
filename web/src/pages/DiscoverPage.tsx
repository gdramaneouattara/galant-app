import React, { useEffect, useState, useCallback } from 'react';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MapPin, X, Heart, Lock, Info, Rocket, User as UserIcon, SlidersHorizontal, Sparkles, RefreshCw, ChevronRight, Crown, Gem, MessageCircle, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import FilterModal from '../components/FilterModal';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import { apiRequest } from '@shared/lib/api';
import logoImg from '../assets/galant-logo.png';

const DiscoverPage: React.FC = () => {
  const { user, profile: myProfile, loading: authLoading, t } = useAuth();
  const { suggestions, loading, fetchSuggestions, handleSwipe } = useMatchmaking();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [storyBubbles, setStoryBubbles] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesUnavailable, setStoriesUnavailable] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<{ isOpen: boolean; type: 'SUPER_LIKE' | 'DIRECT_MESSAGE'; userName: string; targetId: string } | null>(null);
  const navigate = useNavigate();

  // Motion Values for Swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-150, -50, 0, 50, 150], [0, 0, 1, 0, 0]);

  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

  const [filters, setFilters] = useState({
    gender: 'ALL',
    minAge: 18,
    maxAge: 50,
    premiumOnly: false,
    verifiedOnly: false,
    minScore: 0
  });

  const loadSuggestions = useCallback(async () => {
    // Sécurité renforcée : On ne lance l'appel que si tout est prêt
    if (!user || !myProfile || authLoading) return;

    try {
      await fetchSuggestions(filters);
    } catch (e) {
      console.error("Error loading suggestions", e);
    }
  }, [user, myProfile, authLoading, fetchSuggestions, filters]);

  useEffect(() => {
    loadSuggestions();
    setHasMore(true); // Reset on filter change
  }, [loadSuggestions]);

  // Auto-reload when almost empty
  useEffect(() => {
    if (user && !loading && !authLoading && suggestions.length === 0 && hasMore) {
      // Small delay to let the animation finish or handle empty state gracefully
      const timer = setTimeout(async () => {
        await loadSuggestions();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, authLoading, suggestions.length, loadSuggestions, hasMore]);

  // If loading finished and we STILL have 0 suggestions, we mark as out of profiles
  useEffect(() => {
    if (!loading && suggestions.length === 0 && hasMore && !authLoading) {
       // We only do this if a request was actually made
       setHasMore(false);
    }
  }, [loading, suggestions.length, authLoading]);

  useEffect(() => {
    if (user && !loading && suggestions.length === 0) {
      apiRequest('/api/tracking/event', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ eventType: 'EMPTY_DISCOVER' })
      }).catch(() => {});
    }
  }, [user, loading, suggestions.length]);

  useEffect(() => {
    if (!user) {
      setStoryBubbles([]);
      setStoriesUnavailable(false);
      return;
    }

    setStoriesLoading(true);
    setStoriesUnavailable(false);
    apiRequest<any[]>('/api/statuses', { requireAuth: true })
      .then((items) => {
        setStoryBubbles((items || []).slice(0, 20));
        setStoriesUnavailable(false);
      })
      .catch(() => {
        setStoryBubbles([]);
        setStoriesUnavailable(true);
      })
      .finally(() => setStoriesLoading(false));
  }, [user]);

  const onSwipe = async (direction: 'LEFT' | 'RIGHT') => {
    const target = suggestions[0];
    if (!target) return;

    await handleSwipe(target.id, direction);
    x.set(0); // Reset position for next card
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 120;
    if (info.offset.x > threshold) {
      onSwipe('RIGHT');
    } else if (info.offset.x < -threshold) {
      onSwipe('LEFT');
    }
  };

  const handleSuperLike = async () => {
    const target = suggestions[0];
    if (!target) return;

    try {
      await apiRequest('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ targetUserId: target.id, direction: 'RIGHT', isSuperLike: true }),
      });
      await loadSuggestions();
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('premium_required_for_super_like') || message.includes('premium') || message.includes('required')) {
        setPurchaseModal({ isOpen: true, type: 'SUPER_LIKE', userName: target.name, targetId: target.id });
        return;
      }
      console.error('Error sending super like', error);
    }
  };

  const openDirectThread = async (target: any) => {
    const res = await apiRequest<{ matchId: string }>('/api/messages/direct-thread', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({ targetUserId: target.id }),
    });
    navigate(`/chat/${res.matchId}`, { state: { profile: target } });
  };

  const handleDirectMessage = async () => {
    const target = suggestions[0];
    if (!target) return;

    try {
      await openDirectThread(target);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('payment_required') || message.includes('Premium') || message.includes('achat direct')) {
        setPurchaseModal({ isOpen: true, type: 'DIRECT_MESSAGE', userName: target.name, targetId: target.id });
        return;
      }
      console.error('Error opening direct thread', error);
    }
  };

  const handlePurchaseSuccess = async () => {
    const modal = purchaseModal;
    if (!modal) return;
    setPurchaseModal(null);

    const target = suggestions.find((item) => item.id === modal.targetId) || suggestions[0];
    if (!target || target.id !== modal.targetId) {
      await loadSuggestions();
      return;
    }

    if (modal.type === 'SUPER_LIKE') {
      await handleSwipe(modal.targetId, 'RIGHT', true);
      return;
    }

    await openDirectThread(target);
  };

  const openDetail = (profile: any) => {
    navigate(`/profile/${profile.id}`, { state: { profile } });
  };

  if (authLoading || (loading && suggestions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-primary/40 animate-pulse" size={32} />
          </div>
        </div>
        <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
          Le charme opère...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-10 bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl border border-white/10 text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Logo without frame for visible animation */}
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center animate-pulse">
            <img
              src={logoImg}
              alt="Galant"
              className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white italic tracking-tighter">
              Bienvenue
            </h2>
            <div className="h-1.5 w-14 bg-primary mx-auto rounded-full"></div>
          </div>

          <p className="text-white/90 font-medium leading-relaxed text-sm px-4">
            Faites éclore de belles histoires. Offrez une rose, commencez une rencontre d'exception.
          </p>

          <div className="space-y-6 pt-2">
            <Link
              to="/auth"
              className="block w-full bg-[#ef4444] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-red-500/40"
            >
              CRÉER UN COMPTE
            </Link>

            <Link
              to="/auth"
              className="block text-white/50 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
            >
              DÉJÀ MEMBRE ? SE CONNECTER
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentProfile = suggestions[0];

  return (
    <div className="max-w-2xl mx-auto pb-10 px-4">
      {/* Header avec un look plus "App" */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
            {t('discover') || "Découverte"}
          </h2>
          <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest">
            {t('discover_subtitle') || "Pour vous"}
          </p>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="w-14 h-14 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:text-primary transition-all group relative"
        >
          <SlidersHorizontal size={24} className="group-hover:rotate-12 transition-transform" />
          {(filters.premiumOnly || filters.verifiedOnly || filters.minScore > 0) && (
            <div className="absolute top-3 right-3 w-3 h-3 bg-primary rounded-full border-2 border-white"></div>
          )}
        </button>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Stories</p>
          <button
            type="button"
            onClick={() => navigate('/stories')}
            className="text-[10px] font-black uppercase tracking-widest text-primary"
          >
            Voir tout
          </button>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
          <div className="flex items-start gap-4 min-w-max pb-1">
            <button
              type="button"
              onClick={() => navigate('/stories', { state: { openComposer: true } })}
              className="w-[72px] flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full border-2 border-primary bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Plus size={28} className="text-primary" strokeWidth={3} />
              </div>
              <span className="w-full text-center text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">Ma story</span>
            </button>

            {storiesLoading && [0, 1, 2].map((item) => (
              <div key={item} className="w-[72px] flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="w-12 h-2 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
            ))}

            {!storiesLoading && storyBubbles.map((story) => (
              <button
                type="button"
                key={story.id}
                onClick={() => navigate('/stories', { state: { initialStatusId: story.id } })}
                className="w-[72px] flex flex-col items-center gap-2 group"
              >
                <div className={`relative w-16 h-16 rounded-full p-0.5 border-2 ${story.profiles?.is_premium ? 'border-amber-400' : 'border-primary'} group-hover:scale-105 transition-transform`}>
                  <img
                    src={story.profiles?.photos?.[0] || 'https://placehold.co/100x100'}
                    alt=""
                    className="w-full h-full rounded-full object-cover bg-slate-200"
                  />
                  <span className="absolute -right-0.5 -bottom-0.5 w-5 h-5 rounded-full bg-primary border-2 border-white dark:border-slate-950" />
                </div>
                <span className="w-full text-center text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">
                  {story.profiles?.name || 'Story'}
                </span>
              </button>
            ))}

            {!storiesLoading && storyBubbles.length === 0 && (
              <button
                type="button"
                onClick={() => navigate(storiesUnavailable ? '/premium' : '/stories')}
                className="w-[150px] flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Sparkles size={18} className="text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase leading-4 text-slate-500 dark:text-slate-400">
                  {storiesUnavailable ? 'Stories Premium' : 'Aucune story active'}
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {currentProfile ? (
        <div className="space-y-8">
          <motion.div
            key={currentProfile.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            style={{ x, rotate }}
            whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative aspect-[3/4.2] w-full rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] border-8 border-white group bg-slate-100 touch-none"
          >
            <div onClick={() => openDetail(currentProfile)} className="w-full h-full cursor-pointer">
              <img
                src={currentProfile.photos?.[0] || 'https://placehold.co/400x600'}
                className="w-full h-full object-cover pointer-events-none"
                alt={currentProfile.name}
              />

              {/* Swipe Badges */}
              <motion.div
                style={{ opacity: likeOpacity }}
                className="absolute top-10 left-10 border-4 border-green-500 rounded-2xl px-6 py-2 rotate-[-20deg] z-20"
              >
                <span className="text-green-500 text-4xl font-black uppercase tracking-widest">LIKE</span>
              </motion.div>

              <motion.div
                style={{ opacity: nopeOpacity }}
                className="absolute top-10 right-10 border-4 border-red-500 rounded-2xl px-6 py-2 rotate-[20deg] z-20"
              >
                <span className="text-red-500 text-4xl font-black uppercase tracking-widest">NOPE</span>
              </motion.div>

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>

              <div className="absolute top-8 right-8 flex flex-col gap-3 pointer-events-none">
                {currentProfile.is_premium && (
                  <div className="bg-amber-400 text-black w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center animate-pulse">
                    <Crown size={24} fill="currentColor" />
                  </div>
                )}
                {currentProfile.is_verified && (
                  <div className="bg-blue-500 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                )}
              </div>

              <div className="absolute inset-x-8 bottom-10 text-white pointer-events-none">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-black tracking-tight leading-none">
                    {(currentProfile.name || '').trim()}, {currentProfile.age}
                  </h3>
                  {currentProfile.galanterie_score >= 4.5 && (
                    <div className="bg-rose-500/30 backdrop-blur-md px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1">
                      <Gem size={12} className="text-rose-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-100">Élite</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-white/80 font-bold text-sm mb-6">
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                    <MapPin size={16} className="text-primary" />
                    <span>{currentProfile.city || t('city_not_set')}</span>
                  </div>
                  {currentProfile.distance_km && (
                    <span className="text-[10px] bg-white/5 px-3 py-2 rounded-xl border border-white/5 uppercase tracking-widest">
                      À {currentProfile.distance_km.toFixed(1)} km
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-3 flex-1 min-w-0">
                    <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 truncate">Score de Charme</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-white">{Math.round(currentProfile.score || 50)}</span>
                      <span className="text-[8px] font-bold text-primary">pts</span>
                    </div>
                  </div>
                  {(currentProfile.common_interests_count || 0) > 0 ? (
                    <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-3 flex-1 min-w-0">
                      <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 truncate">Affinités</p>
                      <p className="text-[10px] font-black text-white truncate uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={10} className="text-primary" />
                        {currentProfile.common_interests_count} communs
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-3 flex-1 min-w-0">
                      <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 truncate">Status</p>
                      <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">
                        {currentProfile.is_premium ? t('premium_member') : 'Classique'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-6 py-4 px-4">
            <button
              onClick={() => onSwipe('LEFT')}
              className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-slate-300 hover:text-red-500 hover:border-red-500/20 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all border border-slate-100"
            >
              <X size={28} strokeWidth={3} />
            </button>

            <button
              onClick={handleDirectMessage}
              className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all border border-slate-100"
            >
              <MessageCircle size={28} fill="currentColor" className="opacity-20" />
            </button>

            <button
              onClick={handleSuperLike}
              className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-100 group"
            >
              <span className="text-2xl group-hover:rotate-12 transition-transform">🌹</span>
            </button>

            <button
              onClick={() => onSwipe('RIGHT')}
              className="w-20 h-20 rounded-[1.8rem] bg-primary shadow-2xl shadow-red-500/30 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all group"
            >
              <Heart size={38} fill="currentColor" className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 p-12 space-y-8 animate-in fade-in duration-700">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200">
            <RefreshCw size={48} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 mb-2">{t('no_more_profiles') || "Fin de la découverte"}</p>
            <p className="text-slate-400 font-medium">Revenez plus tard pour de nouvelles étincelles.</p>
          </div>
          <button
            onClick={() => loadSuggestions()}
            className="w-full bg-primary text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-red-500/20 hover:scale-105 transition-all active:scale-95"
          >
            {t('reload') || "Relancer le charme"}
          </button>
        </div>
      )}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        is_premium={!!myProfile?.is_premium}
      />

      <InteractionPurchaseModal
        isOpen={!!purchaseModal}
        onClose={() => setPurchaseModal(null)}
        type={purchaseModal?.type || 'SUPER_LIKE'}
        targetId={purchaseModal?.targetId}
        userName={purchaseModal?.userName || ''}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
};

export default DiscoverPage;
