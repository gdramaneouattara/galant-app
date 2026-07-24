import { useState, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { showAlert } from '../lib/ui-bridge';

// Type partagé (pourrait être déplacé dans src/types.ts plus tard)
export type ProfileDetailParam = {
  id: string;
  name: string;
  age: number;
  photos: string[];
  city: string | null;
  score: number;
  is_verified: boolean;
  is_premium: boolean;
  distance_km?: number | null;
  bio?: string;
  interests?: string[];
  gender?: string;
};

export type SwipeDirection = 'LEFT' | 'RIGHT';

interface SwipeResponse {
  matched?: boolean;
  matchId?: string | null;
}

export interface MatchmakingFilters {
  gender: string;
  minAge: number;
  maxAge: number;
  city: string;
  maxDistanceKm: number;
  premiumOnly?: boolean;
  verifiedOnly?: boolean;
  minScore?: number;
}

export const useMatchmaking = () => {
  const [suggestions, setSuggestions] = useState<ProfileDetailParam[]>([]);
  const [loading, setLoading] = useState(false);
  const [swiping, setSwiping] = useState(false);

  const fetchSuggestions = useCallback(async (filters?: MatchmakingFilters, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters) {
        params.set('gender', filters.gender || 'ALL');
        params.set('minAge', String(filters.minAge || 18));
        params.set('maxAge', String(filters.maxAge || 50));
        params.set('maxDistanceKm', String(filters.maxDistanceKm || 50));
        if (filters.city && typeof filters.city === 'string' && filters.city.trim()) {
          params.set('city', filters.city.trim());
        }
        if (filters.premiumOnly) params.set('premiumOnly', 'true');
        if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
        if (filters.minScore) params.set('minScore', String(filters.minScore));
      }
      if (search && typeof search === 'string' && search.trim()) params.set('search', search.trim());

      const data = await apiRequest<{ suggestions: ProfileDetailParam[] }>(`/api/matchmaking/suggestions?${params.toString()}`, {
        requireAuth: true,
      });
      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      if (!String(error?.message).includes('subscription_required')) {
        showAlert('Erreur', 'Impossible de charger les suggestions.');
      }
      throw error; // Re-throw to handle subscription_required in screen
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSwipe = useCallback(async (
    targetUserId: string,
    direction: SwipeDirection,
    isSuperLike = false
  ): Promise<SwipeResponse | null> => {
    if (swiping) return null;

    setSwiping(true);
    try {
      const res = await apiRequest<SwipeResponse>('/api/matchmaking/swipe', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          targetUserId,
          direction,
          isSuperLike,
        }),
      });

      // Optimistically remove from local list if it was a suggestion
      setSuggestions(prev => prev.filter(s => s.id !== targetUserId));

      return res;
    } catch (error: any) {
      console.error('Error swiping:', error);
      showAlert('Erreur', error?.message || 'Action impossible pour le moment.');
      return null;
    } finally {
      setSwiping(false);
    }
  }, [swiping]);

  return {
    suggestions,
    loading,
    swiping,
    fetchSuggestions,
    handleSwipe,
    setSuggestions,
  };
};
