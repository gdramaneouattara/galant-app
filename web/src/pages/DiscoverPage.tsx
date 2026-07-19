import React, { useEffect, useState, useCallback } from 'react';
import { useMatchmaking } from '@shared/hooks/useMatchmaking';
import { useAuth } from '../context/AuthContext';
import { Star, ShieldCheck, MapPin, X, Heart, Lock, Info, Rocket, User as UserIcon, SlidersHorizontal, Sparkles, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import FilterModal from '../components/FilterModal';
import { apiRequest } from '@shared/lib/api';

const DiscoverPage: React.FC = () => {
  const logoImg = "https://raw.githubusercontent.com/gdramaneouattara/galant-app/main/web/public/pwa-192x192.png";
  const { user, profile: myProfile, loading: authLoading, t } = useAuth();
  const { suggestions, loading, fetchSuggestions, handleSwipe } = useMatchmaking();
  const [currentIndex, setCurrentCardIndex] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibilityRank, setVisibilityRank] = useState<{ rank: number | null, total: number }>({ rank: null, total: 0 });
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

  const fetchVisibilityRank = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest<{ rank: number | null, total: number }>('/api/matchmaking/visibility-insight', { requireAuth: true });
      setVisibilityRank(data);
    } catch (e) {
      console.error('Error fetching visibility rank:', e);
    }
  }, [user]);

  useEffect(() => {
    loadSuggestions();
    fetchVisibilityRank();
  }, [loadSuggestions, fetchVisibilityRank]);

  useEffect(() => {
    if (user && !loading && suggestions.length === 0) {
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
        <div className="w-full max-w-md p-10 bg-slate-950/40 backdrop-blur-2xl rounded-[3.5rem] shadow-2xl border border-white/10 text-center space-y-10 animate-in fade-in zoom-in-95 duration-700">
          {/* Logo container matching the screenshot */}
          <div className="relative mx-auto w-24 h-24 bg-white rounded-2xl flex items-center justify-center">
            {/* Red Glow behind the white square */}
            <div className="absolute -inset-4 bg-primary/30 rounded-full blur-2xl animate-pulse"></div>
            <img src={logoImg} alt="Galant Logo" className="w-14 h-14 object-contain relative z-10" />
          </div>

          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white italic tracking-tighter">
              Bienvenue
            </h2>
            <div className="h-1.5 w-14 bg-primary mx-auto rounded-full"></div>
          </div>

          <p className="text-slate-200 font-medium leading-relaxed text-sm px-4">
            Faites éclore de belles histoires. Offrez une rose, commencez une rencontre d'exception.
          </p>

          <div className="space-y-6 pt-2">
            <Link
              to="/auth"
              className="block w-full bg-primary text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.1em] hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-red-500/20"
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

  const currentProfile = suggestions[currentIndex];

  return (
    <div className="max-w-xl mx-auto pb-10 px-4">
      {/* Header avec un look plus "App" */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 leading-none">
            {t('discover') || "Découverte"}
          </h2>
          <p className="text-slate-400 font-bold mt-2 text-sm uppercase tracking-widest">
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

      {myProfile && (
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-[2rem] shadow-xl shadow-blue-500/20 flex items-center gap-5 group cursor-pointer overflow-hidden relative"
             onClick={() => navigate('/profile')}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Rocket size={24} className="group-hover:-translate-y-1 transition-transform" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-1 opacity-80">Rayonnement Galant</p>
            <p className="text-white font-bold leading-tight">
              {visibilityRank.rank
                ? t('rank_insight', { rank: visibilityRank.rank, total: visibilityRank.total, city: myProfile.city || 'votre ville' })
                : "Boostez votre profil pour rayonner dans votre ville !"}
            </p>
          </div>
          <ChevronRight className="text-white/40 group-hover:text-white transition-colors" size={20} />
        </div>
      )}

      {currentProfile ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-500">
          <div
            onClick={() => openDetail(currentProfile)}
            className="relative aspect-[3/4.2] w-full rounded-[3.5rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] border-8 border-white cursor-pointer group bg-slate-100"
          >
            <img
              src={currentProfile.photos?.[0] || 'https://placehold.co/400x600'}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]"
              alt={currentProfile.name}
            />

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

            <div className="absolute top-8 right-8 flex flex-col gap-3">
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

            <div className="absolute inset-x-8 bottom-10 text-white">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-4xl font-black tracking-tight leading-none">
                  {currentProfile.name}, {currentProfile.age}
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

              <div className="flex gap-3">
                <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex-1">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Score de Charme</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">{Math.round(currentProfile.score || 50)}</span>
                    <span className="text-[10px] font-bold text-primary">pts</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex-1">
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Status</p>
                  <p className="text-sm font-black text-white truncate uppercase tracking-widest">
                    {currentProfile.is_premium ? t('premium_member') : 'Membre Classique'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center gap-8 py-4 px-4">
            <button
              onClick={() => onSwipe('LEFT')}
              className="w-20 h-20 rounded-[1.8rem] bg-white shadow-2xl shadow-slate-200/50 flex items-center justify-center text-slate-300 hover:text-red-500 hover:border-red-500/20 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all border border-slate-100"
            >
              <X size={32} strokeWidth={3} />
            </button>

            <button
              className="w-16 h-16 rounded-[1.5rem] bg-white shadow-2xl shadow-slate-200/50 flex items-center justify-center text-amber-500 hover:scale-110 active:scale-95 transition-all border border-slate-100 group"
            >
              <Rocket size={24} className="group-hover:-translate-y-1 transition-transform" />
            </button>

            <button
              onClick={() => onSwipe('RIGHT')}
              className="w-24 h-24 rounded-[2.2rem] bg-primary shadow-2xl shadow-red-500/30 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all group"
            >
              <Heart size={44} fill="currentColor" className="group-hover:scale-110 transition-transform" />
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
            onClick={() => { setCurrentCardIndex(0); fetchSuggestions(); }}
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
    </div>
  );
};

export default DiscoverPage;
