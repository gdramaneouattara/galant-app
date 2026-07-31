import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  MapPin,
  Search,
  Sparkles,
  RefreshCw,
  Crown,
  Gem,
  LayoutGrid,
  ChevronLeft,
  LayoutList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

type DiscoverSuggestion = {
  id: string;
  name: string;
  age: number;
  photos: string[];
  photo_variants?: Record<string, { thumb?: string; medium?: string; full?: string }>;
  city: string | null;
  score: number;
  is_verified: boolean;
  is_premium: boolean;
  super_liked_me: boolean;
  boosted_until: string | null;
  distance_km: number | null;
  galanterie_score?: number;
};

const DiscoverGridPage: React.FC = () => {
  const { user, profile: myProfile, loading: authLoading, t } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (myProfile && !myProfile.is_premium && (myProfile.grid_consultations_remaining || 0) <= 0) {
      navigate('/');
    }
  }, [myProfile, navigate]);

  const fetchSuggestions = useCallback(async (q = '') => {
    if (!user || authLoading) return;
    try {
      setLoading(true);
      const safeQ = q.trim();
      const searchParam = safeQ ? `&search=${encodeURIComponent(safeQ)}` : '';
      const res = await apiRequest<{ suggestions: DiscoverSuggestion[] }>(
        `/api/matchmaking/suggestions?limit=80&isGrid=true${searchParam}`,
        { requireAuth: true }
      );
      setProfiles(res.suggestions || []);
    } catch (e: any) {
      console.error('Error fetching grid suggestions', e);
      if (e.message?.includes('quota_exceeded')) {
        showAlert('Quota épuisé', "Votre quota d'exploration Galerie est terminé.");
        navigate('/');
      }
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchSuggestions(searchQuery);
  };

  if (authLoading || (loading && profiles.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <RefreshCw className="animate-spin text-primary" size={48} />
        <p className="mt-8 text-slate-400 font-serif italic tracking-tighter text-xl">L'élégance se prépare...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-8">
      {/* Header prestige */}
      <div className="flex justify-between items-start pt-2">
        <div>
          <h2 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">
            La Galerie
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] uppercase tracking-prestige">
              Parcourez les profils avec efficacité
            </p>
            {!myProfile?.is_premium && myProfile?.grid_consultations_remaining !== undefined && (
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                <Sparkles size={10} className="text-amber-500" />
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                  {Math.max(0, myProfile.grid_consultations_remaining)} profils restants
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-95"
            title="Vue Swipe"
          >
            <LayoutList size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Rechercher un membre, une ville..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] py-5 pl-14 pr-6 font-medium text-sm shadow-xl shadow-slate-200/50 dark:shadow-none focus:outline-none focus:border-primary/30 transition-all dark:text-white"
        />
      </form>

      {/* Grid */}
      {profiles.length === 0 && !loading ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5 p-12 space-y-6">
          <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700">
            <Search size={40} />
          </div>
          <p className="text-xl font-serif italic text-slate-900 dark:text-white">Aucun profil ne correspond à votre recherche</p>
          <button
            onClick={() => { setSearchQuery(''); fetchSuggestions(''); }}
            className="text-primary font-bold uppercase tracking-prestige text-[10px]"
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => navigate(`/profile/${profile.id}`, { state: { profile } })}
              className="group relative aspect-[3/4] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-1 bg-slate-100 dark:bg-slate-800"
            >
              <OptimizedImage
                src={optimizedPhotoUrl(profile.photos?.[0], profile.photo_variants, 'thumb') || 'https://placehold.co/300x400'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt={profile.name}
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                {profile.is_premium && <div className="bg-amber-400 text-black p-1.5 rounded-lg shadow-lg"><Crown size={14} fill="currentColor" /></div>}
                {profile.is_verified && <div className="bg-blue-500 text-white p-1.5 rounded-lg shadow-lg"><ShieldCheck size={14} /></div>}
              </div>

              {profile.galanterie_score && profile.galanterie_score >= 4.5 && (
                <div className="absolute top-3 right-3 bg-rose-500/80 backdrop-blur-md p-1.5 rounded-lg shadow-lg">
                  <Gem size={14} className="text-white" />
                </div>
              )}

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

              {/* Info */}
              <div className="absolute inset-x-3 bottom-4 text-white">
                <p className="font-serif italic text-lg leading-tight truncate">
                  {profile.name}, {profile.age}
                </p>
                <div className="flex items-center gap-1 mt-1 opacity-80">
                  <MapPin size={10} className="text-primary" />
                  <span className="text-[9px] font-bold uppercase tracking-widest truncate">{profile.city || 'Ville'}</span>
                </div>
                {profile.distance_km !== null && (
                  <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mt-1">
                    À {profile.distance_km.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoverGridPage;
