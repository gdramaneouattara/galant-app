import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  LocateFixed,
  Lock,
  MapPin,
  Phone,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Coffee,
  Flower2,
  Gift,
  Hotel,
  Martini,
  Palette,
  Utensils
} from 'lucide-react';
import FeatureHighlight from '../components/FeatureHighlight';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { useSubscription } from '@shared/hooks/useSubscription';
import { showAlert } from '@shared/lib/ui-bridge';

type DiscoveryVenue = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  description?: string;
  photo_url?: string;
  rating?: number;
  user_ratings_total?: number;
  venue_type?: string;
  google_maps_uri?: string | null;
  website_url?: string | null;
  phone_number?: string | null;
};

type DiscoveryCategory = 'ALL' | 'RESTAURANT' | 'LOUNGE' | 'HOTEL' | 'CAFE' | 'BEAUTY' | 'GIFTS' | 'CULTURE';

const copy = {
  fr: {
    title: 'Partenaires autour de moi',
    subtitle: 'Recherche Google directe pour trouver des restaurants, lounges et hotels proches ou dans une ville.',
    cityPlaceholder: 'Ex: Abidjan, Douala, Yaounde...',
    searchCity: 'Chercher',
    nearMe: 'Me geolocaliser',
    unlock: 'Debloquer pour 500 F',
    premium: 'Inclus Premium',
    locked: 'Acces gratuit verrouille',
    lockedBody: 'Les membres Premium y accedent directement. Les comptes gratuits debloquent la recherche pour 500 F.',
    empty: 'Aucune adresse trouvee pour cette recherche.',
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
    subtitle: 'Direct Google search for restaurants, lounges and hotels nearby or in a city.',
    cityPlaceholder: 'E.g. Abidjan, Douala, Yaounde...',
    searchCity: 'Search',
    nearMe: 'Use location',
    unlock: 'Unlock for 500 F',
    premium: 'Included with Premium',
    locked: 'Free access locked',
    lockedBody: 'Premium members get direct access. Free accounts can unlock this search for 500 F.',
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

const APPS = [
  {
    titleKey: 'market',
    subtitleKey: 'market_subtitle',
    href: '/market',
    icon: ShoppingCart,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    titleKey: 'sentinel',
    subtitleKey: 'sentinel_subtitle',
    href: '/sentinel',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-600/10',
  },
];

const AppsPage: React.FC = () => {
  const { t, profile, language } = useAuth();
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();
  const [city, setCity] = useState('');
  const [venues, setVenues] = useState<DiscoveryVenue[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [category, setCategory] = useState<DiscoveryCategory>('ALL');
  const c = copy[language] || copy.fr;
  const hasDiscoveryAccess = !!(profile?.is_premium || profile?.is_vip || profile?.partner_discovery_unlocked);

  const fetchDiscovery = async (params: Record<string, string | number>) => {
    if (!hasDiscoveryAccess) {
      showAlert(c.locked, c.lockedBody);
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
    void fetchDiscovery({ city: cleanCity, category });
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      showAlert('Erreur', 'Geolocalisation indisponible sur cet appareil.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetchDiscovery({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radiusKm: 15,
          category
        });
      },
      () => showAlert('Erreur', 'Impossible de recuperer votre position.'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleUnlock = async () => {
    const ok = await purchaseWithPaystack('PARTNER_DISCOVERY_UNLOCK', 500, 'partner_discovery', {
      targetName: 'Partenaires autour de moi'
    });
    if (ok) {
      showAlert('Succes', 'Recherche partenaires debloquee.');
      if (city.trim()) void fetchDiscovery({ city: city.trim(), category });
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-8">
      <div>
        <h2 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">
          {t('apps')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 text-sm uppercase tracking-prestige">
          {t('apps_subtitle')}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-primary flex items-center justify-center">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="text-lg font-serif italic tracking-tighter text-slate-900 dark:text-white">{c.title}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{c.subtitle}</p>
              </div>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
            hasDiscoveryAccess ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
          }`}>
            {hasDiscoveryAccess ? <Star size={13} /> : <Lock size={13} />}
            {hasDiscoveryAccess ? c.premium : '500 F'}
          </span>
        </div>

        {!hasDiscoveryAccess && (
          <div className="rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{c.locked}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{c.lockedBody}</p>
            </div>
            <button
              onClick={handleUnlock}
              disabled={purchaseLoading}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              {purchaseLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {c.unlock}
            </button>
          </div>
        )}

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
          <button
            onClick={handleLocate}
            disabled={loadingDiscovery}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 disabled:opacity-50"
          >
            <LocateFixed size={16} />
            {c.nearMe}
          </button>
        </div>

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
                    ? 'bg-primary text-white shadow-lg shadow-red-100 dark:shadow-none'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                }`}
              >
                <Icon size={15} />
                {c.categories[item.id]}
              </button>
            );
          })}
        </div>

        {hasSearched && !loadingDiscovery && venues.length === 0 && (
          <p className="rounded-2xl bg-slate-50 dark:bg-white/5 p-5 text-center text-sm font-bold text-slate-500 dark:text-slate-400">{c.empty}</p>
        )}

        {venues.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <article key={venue.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                {venue.photo_url && <img src={venue.photo_url} alt={venue.name} className="h-36 w-full object-cover" loading="lazy" />}
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
                      <a href={venue.google_maps_uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                        <ExternalLink size={13} />
                        {c.maps}
                      </a>
                    )}
                    {venue.phone_number && (
                      <a href={`tel:${venue.phone_number}`} className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
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
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {APPS.map((app) => {
          const Icon = app.icon;
          const isNew = app.href === '/market' || app.href === '/sentinel';

          return (
            <FeatureHighlight key={app.href} id={`app_${app.href.replace('/', '')}`} active={isNew} type={app.href === '/market' ? 'GOLD' : 'ROSE'}>
              <Link
                to={app.href}
                className="min-h-[180px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all w-full flex flex-col"
              >
                <div className={`w-12 h-12 rounded-2xl ${app.bg} ${app.color} flex items-center justify-center mb-5`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-base font-serif italic tracking-tighter text-slate-900 dark:text-white">{t(app.titleKey as any)}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{t(app.subtitleKey as any)}</p>
              </Link>
            </FeatureHighlight>
          );
        })}
      </div>

      <Link
        to="/partner-signup"
        className="flex items-center gap-4 rounded-2xl border border-dashed border-primary/30 dark:border-primary/20 bg-primary/5 dark:bg-primary/10 p-5 hover:bg-primary/10 transition-all"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white">{t('partner_signup_short')}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{t('partner_signup_short_desc')}</p>
        </div>
      </Link>
    </div>
  );
};

export default AppsPage;
