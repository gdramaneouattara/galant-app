import React, { useEffect, useState, useCallback } from 'react';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import { useAuth } from '../context/AuthContext';
import { Star, ShieldCheck, MapPin, X, Heart, Lock, Info, Rocket, User as UserIcon, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import FilterModal from '../components/FilterModal';

const DiscoverPage: React.FC = () => {
  const { user, profile: myProfile, loading: authLoading, t } = useAuth();
  const { suggestions, loading, fetchSuggestions, handleSwipe } = useMatchmaking();
  const [currentIndex, setCurrentCardIndex] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    gender: 'ALL',
    minAge: 18,
    maxAge: 50,
    premiumOnly: false,
    verifiedOnly: false,
    minScore: 0
  });

  const loadSuggestions = useCallback(async () => {
    if (user) {
      await fetchSuggestions(filters);
    }
  }, [user, fetchSuggestions, filters]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (user && !loading && suggestions.length === 0) {
      // Notifier le concierge IA qu'on n'a plus de profils
      apiRequest('/api/tracking/event', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ eventType: 'EMPTY_DISCOVER' })
      }).catch(() => {});
    }
  }, [user, loading, suggestions.length]);

  const onSwipe = async (direction: 'LEFT' | 'RIGHT') => {
    const target = suggestions[currentIndex];
    if (!target) return;

    await handleSwipe(target.id, direction);
    setCurrentCardIndex(prev => prev + 1);
  };

  const openDetail = (profile: any) => {
    navigate(`/profile/${profile.id}`, { state: { profile } });
  };

  if (authLoading || (loading && suggestions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-10 bg-white/10 backdrop-blur-2xl rounded-[3.5rem] shadow-2xl border border-white/20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative mx-auto w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30 shadow-lg shadow-red-500/20">
            <img src="/pwa-192x192.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-xl" />
            <div className="absolute -inset-1 bg-primary rounded-full animate-ping opacity-20"></div>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-black text-white italic tracking-tighter drop-shadow-md">
              Bienvenue
            </h2>
            <div className="h-1 w-12 bg-primary mx-auto rounded-full"></div>
          </div>

          <p className="text-slate-200 font-medium leading-relaxed text-sm px-4">
            Faites éclore de belles histoires. Offrez une rose, commencez une rencontre d'exception.
          </p>

          <div className="space-y-4 pt-4">
            <Link
              to="/auth"
              className="block w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-red-500/30"
            >
              Créer un compte
            </Link>

            <Link
              to="/auth"
              className="block text-white/60 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
            >
              Déjà membre ? Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentProfile = suggestions[currentIndex];

  return (
    <div className="max-w-lg mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black italic tracking-tighter">Découverte</h2>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="p-3 bg-white shadow-md border border-slate-100 rounded-2xl text-slate-600 hover:text-primary transition-all relative"
        >
          <SlidersHorizontal size={20} />
          {(filters.premiumOnly || filters.verifiedOnly || filters.minScore > 0) && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white"></div>
          )}
        </button>
      </div>

      {myProfile && (
        <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
            <Info size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Visibilité Galante</p>
            <p className="text-sm text-blue-700">{t('rank_insight', { rank: 4, total: 20, city: myProfile.city || 'votre ville' })}</p>
          </div>
        </div>
      )}

      {currentProfile ? (
        <div className="space-y-6">
          <div
            onClick={() => openDetail(currentProfile)}
            className="relative aspect-[3/4] w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white cursor-pointer group"
          >
            <img
              src={currentProfile.photos?.[0] || 'https://placehold.co/400x600'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt={currentProfile.name}
            />

            <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md p-2 rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <UserIcon size={20} />
            </div>

            <div className="absolute top-6 left-6 flex gap-2">
              {currentProfile.is_verified && (
                <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
                  <ShieldCheck size={18} />
                </div>
              )}
              {currentProfile.is_premium && (
                <div className="bg-accent text-white p-2 rounded-full shadow-lg">
                  <Star size={18} fill="currentColor" />
                </div>
              )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black">{currentProfile.name}, {currentProfile.age}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold opacity-90 mb-4">
                <MapPin size={16} className="text-primary" />
                <span>{currentProfile.city || t('city_not_set')}</span>
                {currentProfile.distance_km && <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">À {currentProfile.distance_km.toFixed(1)} km</span>}
              </div>

              <div className="flex gap-2">
                <span className="text-[10px] bg-accent/90 text-black px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                  {t('score')} {Math.round(currentProfile.score)}
                </span>
                {currentProfile.is_premium && (
                  <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                    {t('premium_member')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 pt-4">
            <button
              onClick={() => onSwipe('LEFT')}
              className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 active:scale-90 transition-all border border-slate-100"
            >
              <X size={28} strokeWidth={3} />
            </button>
            <button
              className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-secondary hover:scale-110 active:scale-90 transition-all border border-slate-100"
            >
              <Rocket size={20} fill="currentColor" />
            </button>
            <button
              onClick={() => onSwipe('RIGHT')}
              className="w-20 h-20 rounded-full bg-primary shadow-2xl shadow-red-200 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-all"
            >
              <Heart size={36} fill="currentColor" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-10">
          <p className="text-slate-400 font-bold text-lg mb-6">{t('no_more_profiles')}</p>
          <button
            onClick={() => { setCurrentCardIndex(0); fetchSuggestions(); }}
            className="text-primary font-black text-sm uppercase tracking-widest bg-red-50 px-8 py-4 rounded-2xl"
          >
            {t('reload')}
          </button>
        </div>
      )}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        isPremium={!!myProfile?.is_premium}
      />
    </div>
  );
};

export default DiscoverPage;
