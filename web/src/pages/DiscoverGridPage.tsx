import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  MapPin,
  Search,
  Sparkles,
  RefreshCw,
  Crown,
  Gem,
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

type GridResponse = {
  suggestions: DiscoverSuggestion[];
  next_cursor?: string | null;
  grid_remaining?: number | null;
};

type GridCache = {
  profiles: DiscoverSuggestion[];
  nextCursor: string | null;
  remainingQuota: number | null;
  cachedAt: number;
};

const GRID_PAGE_SIZE = 12;
const GRID_CACHE_TTL_MS = 90 * 60 * 1000;
const GRID_CACHE_PREFIX = 'galant:discover-grid:v3';

const normalizeGridQuota = (value: number | null | undefined) => {
  const remaining = Number(value || 0);
  if (!Number.isFinite(remaining)) return 0;
  return Math.max(0, Math.floor(remaining));
};

const DiscoverGridPage: React.FC = () => {
  const { user, profile: myProfile, loading: authLoading, language } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(
    myProfile?.grid_consultations_remaining === undefined
      ? null
      : normalizeGridQuota(myProfile.grid_consultations_remaining)
  );
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardNodesRef = useRef<Map<string, Element>>(new Map());
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const pendingViewedIdsRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  const initialLoadKeyRef = useRef<string | null>(null);

  const labels = language === 'en'
    ? {
        quotaTitle: 'Quota used',
        quotaBody: 'Your Gallery exploration quota is finished.',
        loading: 'Elegance is getting ready...',
        title: 'The Gallery',
        subtitle: 'Browse profiles efficiently',
        remaining: (count: number) => `${count} profiles remaining`,
        swipeView: 'Swipe View',
        search: 'Search a member, a city...',
        empty: 'No profile matches your search',
        reset: 'Reset search',
        loadMore: 'Load 12 more',
        loadingMore: 'Loading...',
        noMore: 'No more profiles',
        city: 'City',
        distance: (km: number) => `${km.toFixed(1)} km away`
      }
    : {
        quotaTitle: 'Quota épuisé',
        quotaBody: "Votre quota d'exploration Galerie est terminé.",
        loading: "L'élégance se prépare...",
        title: 'La Galerie',
        subtitle: 'Parcourez les profils avec efficacité',
        remaining: (count: number) => `${count} profils restants`,
        swipeView: 'Vue Swipe',
        search: 'Rechercher un membre, une ville...',
        empty: 'Aucun profil ne correspond à votre recherche',
        reset: 'Réinitialiser la recherche',
        loadMore: 'Charger 12 profils',
        loadingMore: 'Chargement...',
        noMore: 'Fin de la galerie',
        city: 'Ville',
        distance: (km: number) => `A ${km.toFixed(1)} km`
      };

  const getCacheKey = useCallback((query: string) => {
    if (!user?.uid) return null;
    const normalizedQuery = query.trim().toLowerCase() || 'default';
    return `${GRID_CACHE_PREFIX}:${user.uid}:${normalizedQuery}`;
  }, [user?.uid]);

  const readCache = useCallback((query: string): GridCache | null => {
    const key = getCacheKey(query);
    if (!key) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GridCache;
      if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > GRID_CACHE_TTL_MS) {
        window.localStorage.removeItem(key);
        return null;
      }
      if (!Array.isArray(parsed.profiles)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [getCacheKey]);

  const writeCache = useCallback((query: string, cache: Omit<GridCache, 'cachedAt'>) => {
    const key = getCacheKey(query);
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({ ...cache, cachedAt: Date.now() }));
    } catch {
      // Storage can be unavailable in private browsing; the gallery still works without cache.
    }
  }, [getCacheKey]);

  useEffect(() => {
    setRemainingQuota(
      myProfile?.grid_consultations_remaining === undefined
        ? null
        : normalizeGridQuota(myProfile.grid_consultations_remaining)
    );
  }, [myProfile?.grid_consultations_remaining]);

  const flushViewedProfiles = useCallback(async () => {
    if (myProfile?.is_premium) {
      pendingViewedIdsRef.current.clear();
      return;
    }

    const ids = [...pendingViewedIdsRef.current].slice(0, GRID_PAGE_SIZE);
    pendingViewedIdsRef.current.clear();
    if (!ids.length) return;

    try {
      const res = await apiRequest<{ remaining?: number | null }>('/api/matchmaking/grid-views', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ profileIds: ids })
      });
      if (typeof res.remaining === 'number') setRemainingQuota(normalizeGridQuota(res.remaining));
    } catch (e: any) {
      if (String(e?.message || '').includes('grid_quota_exceeded')) {
        setRemainingQuota(0);
      }
    }
  }, [myProfile?.is_premium]);

  const markProfileVisible = useCallback((profileId: string) => {
    if (!profileId || myProfile?.is_premium || viewedIdsRef.current.has(profileId)) return;
    viewedIdsRef.current.add(profileId);
    pendingViewedIdsRef.current.add(profileId);

    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      void flushViewedProfiles();
    }, 700);
  }, [flushViewedProfiles, myProfile?.is_premium]);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
        const profileId = (entry.target as HTMLElement).dataset.profileId;
        if (profileId) markProfileVisible(profileId);
      });
    }, { threshold: [0.55] });

    cardNodesRef.current.forEach((node) => observerRef.current?.observe(node));

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      void flushViewedProfiles();
    };
  }, [flushViewedProfiles, markProfileVisible]);

  const registerCard = useCallback((profileId: string, node: HTMLDivElement | null) => {
    const previousNode = cardNodesRef.current.get(profileId);
    if (previousNode) observerRef.current?.unobserve(previousNode);

    if (!node) {
      cardNodesRef.current.delete(profileId);
      return;
    }

    node.dataset.profileId = profileId;
    cardNodesRef.current.set(profileId, node);
    observerRef.current?.observe(node);
  }, []);

  const fetchSuggestions = useCallback(async (q = '', options: { reset?: boolean } = {}) => {
    if (!user || authLoading) return;
    const reset = options.reset !== false;
    const safeQ = q.trim();

    if (reset) {
      const cached = readCache(safeQ);
      if (cached) {
        setProfiles(cached.profiles);
        setNextCursor(cached.nextCursor);
        if (typeof cached.remainingQuota === 'number') setRemainingQuota(normalizeGridQuota(cached.remainingQuota));
        setLoading(false);
        return;
      }
      setProfiles([]);
      setNextCursor(null);
    } else if (!nextCursor) {
      return;
    }

    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const searchParam = safeQ ? `&search=${encodeURIComponent(safeQ)}` : '';
      const cursorParam = !reset && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : '';
      const res = await apiRequest<GridResponse>(
        `/api/matchmaking/suggestions?limit=${GRID_PAGE_SIZE}&isGrid=true${searchParam}${cursorParam}`,
        { requireAuth: true }
      );

      const incoming = res.suggestions || [];
      const newCursor = res.next_cursor || null;
      setNextCursor(newCursor);
      if (typeof res.grid_remaining === 'number') setRemainingQuota(normalizeGridQuota(res.grid_remaining));

      setProfiles((prev) => {
        const base = reset ? [] : prev;
        const knownIds = new Set(base.map(profile => profile.id));
        const merged = [
          ...base,
          ...incoming.filter(profile => !knownIds.has(profile.id))
        ];
        writeCache(safeQ, {
          profiles: merged,
          nextCursor: newCursor,
          remainingQuota: typeof res.grid_remaining === 'number' ? normalizeGridQuota(res.grid_remaining) : remainingQuota
        });
        return merged;
      });
    } catch (e: any) {
      console.error('Error fetching grid suggestions', e);
      if (e.message?.includes('quota_exceeded') || e.message?.includes('grid_quota_exceeded')) {
        showAlert(labels.quotaTitle, labels.quotaBody);
      }
      if (reset) setProfiles([]);
    } finally {
      if (reset) setLoading(false);
      else setLoadingMore(false);
    }
  }, [authLoading, labels.quotaBody, labels.quotaTitle, nextCursor, readCache, remainingQuota, user, writeCache]);

  useEffect(() => {
    if (!user?.uid || authLoading) return;
    if (initialLoadKeyRef.current === user.uid) return;
    initialLoadKeyRef.current = user.uid;
    void fetchSuggestions('', { reset: true });
  }, [authLoading, fetchSuggestions, user?.uid]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    viewedIdsRef.current.clear();
    pendingViewedIdsRef.current.clear();
    void fetchSuggestions(searchQuery, { reset: true });
  };

  if (authLoading || (loading && profiles.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <RefreshCw className="animate-spin text-primary" size={48} />
        <p className="mt-8 text-slate-400 font-sans  tracking-tighter text-xl">{labels.loading}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-8">
      {/* Header prestige */}
      <div className="flex justify-between items-start pt-2">
        <div>
          <h2 className="text-4xl font-sans  tracking-tighter text-slate-900 dark:text-white leading-none">
            {labels.title}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] uppercase tracking-prestige">
              {labels.subtitle}
            </p>
            {!myProfile?.is_premium && myProfile?.grid_consultations_remaining !== undefined && (
              <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                <Sparkles size={10} className="text-amber-500" />
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                  {labels.remaining(normalizeGridQuota(remainingQuota ?? myProfile.grid_consultations_remaining))}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-95"
            title={labels.swipeView}
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
          placeholder={labels.search}
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
          <p className="text-xl font-sans  text-slate-900 dark:text-white">{labels.empty}</p>
          <button
            onClick={() => { setSearchQuery(''); fetchSuggestions('', { reset: true }); }}
            className="text-primary font-bold uppercase tracking-prestige text-[10px]"
          >
            {labels.reset}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {profiles.map((profile, index) => (
            <div
              ref={(node) => registerCard(profile.id, node)}
              key={profile.id}
              onClick={() => navigate(`/profile/${profile.id}`, { state: { profile } })}
              className="group relative aspect-[3/4] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-1 bg-slate-100 dark:bg-slate-800"
            >
              <OptimizedImage
                src={optimizedPhotoUrl(profile.photos?.[0], profile.photo_variants, 'thumb') || 'https://placehold.co/300x400'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt={profile.name}
                eager={index < 6}
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                {profile.is_premium && <div className="bg-amber-400 text-black p-1.5 rounded-lg shadow-lg"><Crown size={14} fill="currentColor" /></div>}
                {profile.is_verified && <div className="bg-blue-500 text-white p-1.5 rounded-lg shadow-lg"><ShieldCheck size={14} /></div>}
              </div>

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

              {/* Info */}
              <div className="absolute inset-x-3 bottom-4 text-white">
                <p className="font-sans  text-lg leading-tight truncate">
                  {profile.name}, {profile.age}
                </p>
                <div className="flex items-center gap-1 mt-1 opacity-80">
                  <MapPin size={10} className="text-primary" />
                  <span className="text-[9px] font-bold uppercase tracking-widest truncate">{profile.city || labels.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {profiles.length > 0 && (
        <div className="flex justify-center pt-2">
          {nextCursor && (myProfile?.is_premium || (remainingQuota ?? 0) > 0) ? (
            <button
              type="button"
              onClick={() => void fetchSuggestions(searchQuery, { reset: false })}
              disabled={loadingMore}
              className="rounded-2xl bg-slate-900 dark:bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-slate-900 shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {loadingMore ? labels.loadingMore : labels.loadMore}
            </button>
          ) : (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.noMore}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoverGridPage;
