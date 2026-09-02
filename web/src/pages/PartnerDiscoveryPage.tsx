import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Coffee,
  ExternalLink,
  Flower2,
  Gift,
  Hotel,
  Loader2,
  LocateFixed,
  MapPin,
  Martini,
  Palette,
  Phone,
  Search,
  Sparkles,
  Star,
  Utensils
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import InteractionPurchaseModal from '../components/InteractionPurchaseModal';

type DiscoveryVenue = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  photo_url?: string;
  rating?: number;
  user_ratings_total?: number;
  google_maps_uri?: string | null;
  phone_number?: string | null;
};

type DiscoveryCategory = 'ALL' | 'RESTAURANT' | 'LOUNGE' | 'HOTEL' | 'CAFE' | 'BEAUTY' | 'GIFTS' | 'CULTURE';

const DISCOVERY_CATEGORIES: Array<{ id: DiscoveryCategory; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'ALL', icon: Sparkles },
  { id: 'RESTAURANT', icon: Utensils },
  { id: 'LOUNGE', icon: Martini },
  { id: 'HOTEL', icon: Hotel },
  { id: 'CAFE', icon: Coffee },
  { id: 'BEAUTY', icon: Flower2 },
  { id: 'GIFTS', icon: Gift },
  { id: 'CULTURE', icon: Palette }
];

const copy = {
  fr: {
    title: 'Partenaires autour de moi',
    subtitle: 'Trouvez des lieux utiles pour vos sorties, rendez-vous et attentions.',
    cityPlaceholder: 'Ex: Abidjan, Douala, Yaounde...',
    searchCity: 'Chercher cette ville',
    nearMe: 'Me geolocaliser',
    searchNearMe: 'Chercher autour de moi',
    locationReady: 'Position prete',
    chooseCategoryFirst: 'Choisissez une categorie, puis cherchez par ville ou autour de vous.',
    payTitle: 'Fonctionnalite payante',
    payBody: 'Les membres Premium y accèdent directement. Les comptes gratuits peuvent débloquer cette recherche pour 500 F CFA.',
    unlock: 'Débloquer pour 500 F',
    empty: 'Aucune adresse trouvée pour cette recherche.',
    maps: 'Ouvrir Maps',
    call: 'Appeler',
    categories: {
      ALL: 'Tous',
      RESTAURANT: 'Restaurants',
      LOUNGE: 'Lounges',
      HOTEL: 'Hotels',
      CAFE: 'Cafes',
      BEAUTY: 'Spa & Beaute',
      GIFTS: 'Fleurs & Cadeaux',
      CULTURE: 'Culture & Loisirs'
    }
  },
  en: {
    title: 'Partners near me',
    subtitle: 'Find useful places for dates, outings and thoughtful gestures.',
    cityPlaceholder: 'E.g. Abidjan, Douala, Yaounde...',
    searchCity: 'Search this city',
    nearMe: 'Use location',
    searchNearMe: 'Search near me',
    locationReady: 'Location ready',
    chooseCategoryFirst: 'Choose a category, then search by city or around you.',
    payTitle: 'Paid feature',
    payBody: 'Premium members get direct access. Free accounts can unlock this search for 500 F CFA.',
    unlock: 'Unlock for 500 F',
    empty: 'No venue found for this search.',
    maps: 'Open Maps',
    call: 'Call',
    categories: {
      ALL: 'All',
      RESTAURANT: 'Restaurants',
      LOUNGE: 'Lounges',
      HOTEL: 'Hotels',
      CAFE: 'Cafes',
      BEAUTY: 'Spa & Beauty',
      GIFTS: 'Flowers & Gifts',
      CULTURE: 'Culture & Leisure'
    }
  }
};

const PartnerDiscoveryPage: React.FC = () => {
  const { profile, language } = useAuth();
  const [city, setCity] = useState('');
  const [venues, setVenues] = useState<DiscoveryVenue[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [category, setCategory] = useState<DiscoveryCategory>('ALL');
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const c = copy[language] || copy.fr;
  const hasDiscoveryAccess = !!(profile?.is_premium || profile?.is_vip || profile?.partner_discovery_unlocked);

  const fetchDiscovery = async (params: Record<string, string | number>) => {
    if (!hasDiscoveryAccess) {
      setUnlockModalOpen(true);
      return;
    }

    try {
      setLoadingDiscovery(true);
      setHasSearched(true);
      const query = new URLSearchParams(
        Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {})
      ).toString();
      const response = await apiRequest<{ venues: DiscoveryVenue[] }>(`/api/venues/partner-discovery/google?${query}`, {
        requireAuth: true
      });
      setVenues(response.venues || []);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Recherche indisponible.');
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleCitySearch = () => {
    const cleanCity = city.trim();
    if (!cleanCity) return;
    setLocationCoords(null);
    void fetchDiscovery({ city: cleanCity, category });
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      showAlert('Erreur', 'Geolocalisation indisponible sur cet appareil.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        showAlert('Erreur', 'Impossible de récupérer votre position.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleNearbySearch = () => {
    if (!locationCoords) return;
    void fetchDiscovery({
      latitude: locationCoords.latitude,
      longitude: locationCoords.longitude,
      radiusKm: 15,
      category
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 space-y-6">
      <Link to="/apps" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary">
        <ArrowLeft size={16} />
        Apps
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-primary flex items-center justify-center">
            <MapPin size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-sans  tracking-tighter text-slate-900 dark:text-white">{c.title}</h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{c.subtitle}</p>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {c.chooseCategoryFirst}
        </p>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {DISCOVERY_CATEGORIES.map((item) => {
            const Icon = item.icon;
            const active = category === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCategory(item.id)}
                className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  active
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                }`}
              >
                <Icon size={15} />
                {c.categories[item.id]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleCitySearch()}
              placeholder={c.cityPlaceholder}
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-3 pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleCitySearch}
            disabled={loadingDiscovery || !city.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-white dark:text-slate-900 disabled:opacity-50"
          >
            {loadingDiscovery ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {c.searchCity}
          </button>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10">
          <button
            onClick={handleLocate}
            disabled={loadingDiscovery || locating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-700 transition-colors disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            {locating ? <Loader2 size={16} className="animate-spin" /> : locationCoords ? <CheckCircle2 size={16} /> : <LocateFixed size={16} />}
            {locationCoords ? c.locationReady : c.nearMe}
          </button>

          <button
            onClick={handleNearbySearch}
            disabled={loadingDiscovery || locating || !locationCoords}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {loadingDiscovery ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {c.searchNearMe}
          </button>
        </div>
      </div>

      {hasSearched && !loadingDiscovery && venues.length === 0 && (
        <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 text-center text-sm font-bold text-slate-500 dark:text-slate-400">{c.empty}</p>
      )}

      {venues.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <article key={venue.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
              {venue.photo_url && <img src={venue.photo_url} alt={venue.name} className="h-40 w-full object-cover" loading="lazy" />}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">{venue.name}</h4>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{venue.address || venue.city}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-amber-500">
                  <Star size={14} fill="currentColor" />
                  {Number(venue.rating || 0).toFixed(1)}
                  <span className="text-slate-400">({venue.user_ratings_total || 0})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {venue.google_maps_uri && (
                    <a href={venue.google_maps_uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      <ExternalLink size={13} />
                      {c.maps}
                    </a>
                  )}
                  {venue.phone_number && (
                    <a href={`tel:${venue.phone_number}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      <Phone size={13} />
                      {c.call}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <InteractionPurchaseModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        type="PARTNER_DISCOVERY_UNLOCK"
        targetId="partner_discovery"
        userName={c.title}
        price={500}
        onSuccess={() => setUnlockModalOpen(false)}
      />
    </div>
  );
};

export default PartnerDiscoveryPage;
