import React, { useEffect, useState, useCallback } from 'react';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MapPin, X, Heart, Lock, Info, Rocket, User as UserIcon, SlidersHorizontal as FiltersIcon, Sparkles, RefreshCw, ChevronRight, Crown, Gem, MessageCircle, PlayCircle, LayoutGrid, Bell, ShoppingBag as StoreIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import FilterModal from '../components/FilterModal';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';
import { apiRequest } from '@shared/lib/api';
import logoImg from '../assets/galant-logo-web.png';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const DEFAULT_DISCOVER_FILTERS = {
  gender: 'ALL',
  minAge: 18,
  maxAge: 50,
  city: '',
  premiumOnly: false,
  verifiedOnly: false,
  minScore: 0
};

const DiscoverPage: React.FC = () => {
  const { user, profile: myProfile, loading: authLoading, t, language } = useAuth();
  const { suggestions, loading, fetchSuggestions, handleSwipe } = useMatchmaking();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [pricing, setPricing] = useState<any>(null);
  const [purchaseModal, setPurchaseModal] = useState<{ isOpen: boolean; type: 'SUPER_LIKE' | 'DIRECT_MESSAGE' | 'DISCOVER_GRID_UNLOCK' | 'DISCOVER_FILTERS_UNLOCK'; userName: string; targetId: string } | null>(null);
  const navigate = useNavigate();
  const labels = language === 'en'
    ? {
        galleryAccess: 'Gallery Access',
        loading: 'Charm is working...',
        welcome: 'Welcome',
        welcomeBody: 'Let beautiful stories bloom. Offer a rose and start an exceptional encounter.',
        createAccount: 'Create an account',
        login: 'Already a member? Log in',
        grid: 'Grid View',
        filters: 'Filters',
        elite: 'Elite',
        distance: (km: number) => `${km.toFixed(1)} km away`,
        charmScore: 'Charm Score',
        affinities: 'Affinities',
        common: 'common',
        status: 'Status',
        classic: 'Classic',
        noMore: 'End of discovery',
        noMoreBody: 'Come back later for new sparks.',
        reload: 'Reload charm'
      }
    : {
        galleryAccess: 'Accès Galerie',
        loading: 'Le charme opere...',
        welcome: 'Bienvenue',
        welcomeBody: "Faites eclore de belles histoires. Offrez une rose, commencez une rencontre d'exception.",
        createAccount: 'Creer un compte',
        login: 'Déjà membre ? Se connecter',
        grid: 'Vue Grille',
        filters: 'Filtres',
        elite: 'Elite',
        distance: (km: number) => `A ${km.toFixed(1)} km`,
        charmScore: 'Score de Charme',
        affinities: 'Affinites',
        common: 'communs',
        status: 'Status',
        classic: 'Classique',
        noMore: 'Fin de la decouverte',
        noMoreBody: 'Revenez plus tard pour de nouvelles etincelles.',
        reload: 'Relancer le charme'
      };

  // Motion Values for Swipe
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-150, -50, 0, 50, 150], [0, 0, 1, 0, 0]);

  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

  const [filters, setFilters] = useState(DEFAULT_DISCOVER_FILTERS);

  const loadSuggestions = useCallback(async () => {
    // Sécurité renforcée : On ne lance l'appel que si tout est prêt
    if (!user || !myProfile || authLoading) return;

    try {
      await fetchSuggestions(filters);
    } catch (e) {
      console.error("Error loading suggestions", e);
    } finally {
      setIsApplyingFilters(false);
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
      setNotificationUnreadCount(0);
      return;
    }

    apiRequest<{ unreadCount: number }>('/api/notifications/unread-count', { requireAuth: true })
      .then((payload) => setNotificationUnreadCount(Math.max(0, Number(payload?.unreadCount || 0))))
      .catch(() => setNotificationUnreadCount(0));

    apiRequest<any>('/api/admin/pricing', { requireAuth: true })
      .then((data) => setPricing(data))
      .catch(() => {});
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

    if (modal.type === 'DISCOVER_FILTERS_UNLOCK') {
      setIsFilterOpen(true);
      return;
    }

    await openDirectThread(target);
  };

  const openDetail = (profile: any) => {
    navigate(`/profile/${profile.id}`, { state: { profile } });
  };

  const handleApplyFilters = useCallback((nextFilters: typeof DEFAULT_DISCOVER_FILTERS) => {
    const filtersChanged = JSON.stringify(nextFilters) !== JSON.stringify(filters);
    x.set(0);
    setHasMore(true);
    setIsApplyingFilters(true);
    setFilters(nextFilters);
    if (!filtersChanged) {
      void loadSuggestions();
    }
  }, [filters, loadSuggestions, x]);

  const handleGridTransition = () => {
    const hasAccess = myProfile?.is_premium || (myProfile?.grid_consultations_remaining || 0) > 0;
    if (hasAccess) {
      navigate('/discover-grid');
    } else {
      setPurchaseModal({ isOpen: true, type: 'DISCOVER_GRID_UNLOCK', userName: labels.galleryAccess, targetId: 'grid_unlock' });
    }
  };

  if (authLoading || isApplyingFilters || (loading && suggestions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-primary"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-primary/40 animate-pulse" size={32} />
          </div>
        </div>
        <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
          {labels.loading}
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
            <OptimizedImage
              src={logoImg}
              alt="Galant"
              className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
              eager
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white italic tracking-tighter">
              {labels.welcome}
            </h2>
            <div className="h-1.5 w-14 bg-primary mx-auto rounded-full"></div>
          </div>

          <p className="text-white/90 font-medium leading-relaxed text-sm px-4">
            {labels.welcomeBody}
          </p>

          <div className="space-y-6 pt-2">
            <Link
              to="/auth"
              className="block w-full bg-[#ef4444] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.1em] hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-red-500/40"
            >
              {labels.createAccount}
            </Link>

            <Link
              to="/auth"
              className="block text-white/50 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
            >
              {labels.login}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentProfile = suggestions[0];
  const isFilterActive = filters.premiumOnly || filters.verifiedOnly || filters.minScore > 0 || filters.gender !== 'ALL' || filters.minAge !== 18 || filters.maxAge !== 50;
  const headerActionBaseClass = "relative mx-auto w-10 h-10 shrink-0 rounded-2xl border shadow-lg flex items-center justify-center transition-all active:scale-95";
  const headerActionIdleClass = "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:text-primary";
  const headerActionActiveClass = "bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]";

  return (
    <div className="max-w-3xl mx-auto pb-10 px-1 sm:px-3 relative">
      {/* Header actions */}
      <div className="mb-6 pt-2">
        <div className="grid w-full grid-cols-5 items-center">
          <button
            onClick={() => navigate('/store')}
            className={`${headerActionBaseClass} ${headerActionIdleClass}`}
            title="Store"
            aria-label="Store"
          >
            <StoreIcon size={18} />
          </button>

          <button
            onClick={() => navigate('/stories')}
            className={`${headerActionBaseClass} ${headerActionIdleClass}`}
            title="Stories"
            aria-label="Stories"
          >
            <PlayCircle size={18} />
          </button>

          <button
            onClick={handleGridTransition}
            className={`${headerActionBaseClass} ${headerActionIdleClass}`}
            title={labels.grid}
            aria-label={labels.grid}
          >
            <LayoutGrid size={18} />
          </button>

          <button
            onClick={() => navigate('/notifications', { state: { from: '/' } })}
            className={`${headerActionBaseClass} ${headerActionIdleClass}`}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notificationUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[9px] font-black leading-[18px] text-center shadow-lg shadow-red-500/30">
                {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              const hasAccess = myProfile?.is_premium || (myProfile?.filters_unlocked_until && new Date(myProfile.filters_unlocked_until) > new Date());
              if (hasAccess) {
                setIsFilterOpen(true);
              } else {
                setPurchaseModal({ isOpen: true, type: 'DISCOVER_FILTERS_UNLOCK', userName: labels.filters, targetId: 'filters_unlock' });
              }
            }}
            className={`${headerActionBaseClass} group ${isFilterActive ? headerActionActiveClass : headerActionIdleClass}`}
            title={labels.filters}
            aria-label={labels.filters}
          >
            {!(myProfile?.is_premium || (myProfile?.filters_unlocked_until && new Date(myProfile.filters_unlocked_until) > new Date())) && (
              <Lock size={8} className="absolute top-1 right-1 text-slate-400" />
            )}
            <FiltersIcon size={18} className={isFilterActive ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'} />
          </button>
        </div>
      </div>

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
            className="relative aspect-[3/4.2] w-full rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] border-4 border-white group bg-slate-100 touch-none"
          >
            <div onClick={() => openDetail(currentProfile)} className="w-full h-full cursor-pointer">
              <OptimizedImage
                src={optimizedPhotoUrl(currentProfile.photos?.[0], currentProfile.photo_variants, 'medium') || 'https://placehold.co/400x600'}
                className="w-full h-full object-cover pointer-events-none"
                alt={currentProfile.name}
                eager
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

              <div className="absolute top-8 right-8 flex flex-col gap-3 z-30">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${currentProfile.id}`); }}
                  className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group/btn"
                  title="Voir le profil complet"
                >
                  <ChevronRight size={24} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
                {currentProfile.is_premium && (
                  <div className="bg-amber-400 text-black w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center animate-pulse pointer-events-none">
                    <Crown size={24} fill="currentColor" />
                  </div>
                )}
                {currentProfile.is_verified && (
                  <div className="bg-blue-500 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center pointer-events-none">
                    <ShieldCheck size={24} />
                  </div>
                )}
              </div>

              <div className="absolute inset-x-8 bottom-10 text-white pointer-events-none">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-serif italic tracking-tight leading-none">
                    {(currentProfile.name || '').trim()}, {currentProfile.age}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-white/80 font-bold text-sm">
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                    <MapPin size={16} className="text-primary" />
                    <span>{currentProfile.city || t('city_not_set')}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-6 py-4 px-4">
            <button
              onClick={() => onSwipe('LEFT')}
              className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center text-slate-300 dark:text-slate-700 hover:text-red-500 hover:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-white/5"
            >
              <X size={28} strokeWidth={3} />
            </button>

            <button
              onClick={handleDirectMessage}
              className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-white/5"
            >
              <MessageCircle size={28} fill="currentColor" className="opacity-20" />
            </button>

            <button
              onClick={handleSuperLike}
              className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-white/5 group"
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
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 p-12 space-y-8 animate-in fade-in duration-700 transition-colors">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700 transition-colors">
            <RefreshCw size={48} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mb-2 transition-colors">{t('no_more_profiles') || labels.noMore}</p>
            <p className="text-slate-400 dark:text-slate-500 font-medium transition-colors">{labels.noMoreBody}</p>
          </div>
          <button
            onClick={() => loadSuggestions()}
            className="w-full bg-primary text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-red-500/20 hover:scale-105 transition-all active:scale-95"
          >
            {t('reload') || labels.reload}
          </button>
        </div>
      )}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        defaultFilters={DEFAULT_DISCOVER_FILTERS}
        is_premium={!!myProfile?.is_premium}
      />

      <InteractionPurchaseModal
        isOpen={!!purchaseModal}
        onClose={() => setPurchaseModal(null)}
        type={purchaseModal?.type || 'SUPER_LIKE'}
        targetId={purchaseModal?.targetId}
        userName={purchaseModal?.userName || ''}
        durationDays={purchaseModal?.type === 'DISCOVER_FILTERS_UNLOCK' ? (pricing?.PRICES?.DISCOVER_FILTERS_DAYS || 3) : undefined}
        price={purchaseModal?.type === 'DISCOVER_FILTERS_UNLOCK' ? (pricing?.PRICES?.DISCOVER_FILTERS_UNLOCK || 500) : undefined}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
};

export default DiscoverPage;
