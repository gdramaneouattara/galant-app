import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  MapPin,
  MessageCircle,
  Star,
  Sparkles,
  Navigation as NavigationIcon,
  Share2,
  Phone,
  Clock,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '@shared/lib/ui-bridge';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

const VenueDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useAuth();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        setLoading(true);
        // We use the general search or list to find it if we don't have a direct GET /venue/:id
        // For now, let's assume we can fetch it via a specific endpoint or from the list
        const res = await apiRequest<{ venues: any[] }>(`/api/venues`, { requireAuth: true });
        const found = res.venues.find(v => v.id === id);
        if (found) {
          setVenue(found);
        } else {
          showAlert('Erreur', 'Établissement non trouvé.');
          navigate('/guide');
        }
      } catch (e: any) {
        showAlert('Erreur', 'Impossible de charger les détails.');
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [id, navigate]);

  const startVenueChat = async () => {
    try {
      const res = await apiRequest<{ venueChatId: string }>(`/api/venues/${id}/chat-thread`, {
        method: 'POST',
        requireAuth: true
      });
      navigate(`/chat/${res.venueChatId}`, { state: { venueName: venue.name } });
    } catch (e: any) {
      showAlert('Erreur', 'Impossible d\'ouvrir la discussion.');
    }
  };

  const openInMaps = () => {
    if (!venue) return;
    const { latitude, longitude, address, city } = venue;
    const url = latitude
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}`)}`;
    window.open(url, '_blank');
  };

  if (loading || !venue) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const photos = Array.isArray(venue.photos) && venue.photos.length > 0 ? venue.photos : [venue.photo_url || 'https://placehold.co/600x400?text=Venue'];

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-8 animate-in fade-in duration-500">
      {/* Custom Header */}
      <div className="flex items-center justify-between px-4 pt-2">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-serif italic tracking-tighter text-slate-900 dark:text-white truncate max-w-[200px]">
          {venue.name}
        </h2>
        <button
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: venue.name, url: window.location.href });
            }
          }}
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Gallery */}
      <div className="px-4">
        <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl relative bg-slate-100 dark:bg-slate-800">
          <OptimizedImage src={optimizedPhotoUrl(photos[0], venue.photo_variants, 'medium')} className="w-full h-full object-cover" alt={venue.name} eager />
          <div className="absolute top-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-xl">
             <div className="flex items-center gap-1.5 text-amber-500">
               <Star size={14} fill="currentColor" />
               <span className="text-xs font-black">4.9</span>
             </div>
          </div>
          {photos.length > 1 && (
            <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">
              + {photos.length - 1} Photos
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-tight">
            {venue.name}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <MapPin size={16} className="text-primary" />
            <span className="text-sm font-medium">{venue.address}, {venue.city}</span>
          </div>
        </div>

        {/* Benefits Card */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-rose-900/20 p-8 rounded-[3rem] border border-rose-200/50 dark:border-rose-500/20 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white dark:bg-primary/20 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles size={20} className="text-primary" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-prestige text-primary">Avantage Galant</h3>
          </div>
          <p className="text-lg font-serif italic text-rose-900 dark:text-rose-100 leading-relaxed">
            "{venue.benefit_description || 'Présentez votre badge de membre pour bénéficier d\'une attention particulière.'}"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
           <button
            onClick={openInMaps}
            className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 py-5 rounded-2xl text-slate-900 dark:text-white font-medium text-xs uppercase tracking-prestige hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
           >
             <NavigationIcon size={18} className="text-blue-500" /> Itinéraire
           </button>
           <button
            className="flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 py-5 rounded-2xl text-slate-900 dark:text-white font-medium text-xs uppercase tracking-prestige hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none"
           >
             <Phone size={18} className="text-green-500" /> Appeler
           </button>
        </div>

        {/* About */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-prestige text-slate-400">À propos</h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            {venue.description || 'Cet établissement d\'exception vous accueille dans un cadre raffiné et discret, idéal pour vos rencontres galantes.'}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {['Service Valet', 'Wi-Fi VIP', 'Espace Privé', 'Cave à Cigares'].map(tag => (
              <span key={tag} className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-white/10 z-40">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={startVenueChat}
            className="flex-1 bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-prestige shadow-xl shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <MessageCircle size={20} /> Discuter avec l'hôte
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenueDetailPage;
