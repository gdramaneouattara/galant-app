// Force re-process for Trophy icon
import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Calendar, MapPin, Zap, ChevronRight, Clock, Star, CheckCircle, Sparkles, Filter, Ticket, Share2, Trophy, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showAlert } from '@shared/lib/ui-bridge';
import OptimizedImage from '../components/OptimizedImage';
import { optimizedPhotoUrl } from '@shared/lib/mediaVariants';

interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  photo_url: string;
  photo_variants?: Record<string, { thumb?: string; medium?: string; full?: string }>;
  event_type: 'EVENT' | 'PARTY' | 'FLASH_OFFER' | 'NETWORKING' | 'LIVE_MUSIC';
  starts_at: string;
  expires_at: string;
  attendees_count: number;
  is_attending: boolean;
  source?: string;
  source_label?: string;
  source_url?: string;
  external_ticket_url?: string;
  price_label?: string | null;
  is_external?: boolean;
  venues: {
    name: string;
    city: string;
    photo_url: string;
    photo_variants?: Record<string, { thumb?: string; medium?: string; full?: string }>;
  } | null;
}

const AgendaPage: React.FC = () => {
  const { t, language } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'EVENT' | 'PARTY' | 'FLASH_OFFER' | 'NETWORKING' | 'LIVE_MUSIC'>('ALL');
  const labels = language === 'en'
    ? {
        confirmedTitle: 'Registration confirmed',
        confirmedBody: 'Your place is reserved. Prepare your finest outfit!',
        linkCopied: 'Link copied',
        linkCopiedBody: 'The outing was copied.',
        loading: 'Checking the Royal Agenda...',
        eyebrow: 'Prestige Events',
        titlePrefix: 'Agenda',
        subtitle: 'Exclusive outings, elegant moments and exceptional encounters selected for you.',
        filters: [
          { id: 'ALL', label: 'All' },
          { id: 'EVENT', label: 'Events' },
          { id: 'PARTY', label: 'Parties' },
          { id: 'FLASH_OFFER', label: 'Flash Offers' },
          { id: 'NETWORKING', label: 'Networking' },
          { id: 'LIVE_MUSIC', label: 'Live Music' }
        ],
        cityFilter: 'Filter by city',
        emptyTitle: 'No event planned',
        emptyBody: 'Come back soon to discover the next Galant Circle outings.',
        refresh: 'Refresh',
        cityMissing: 'City not set',
        officialSource: 'Official source',
        hostVenue: 'Host venue',
        ticketing: 'TIKERAMA TICKETS',
        attending: 'I WILL GO',
        reserve: 'RESERVE MY PLACE',
        eliteTitle: 'Access the Galant Elite',
        eliteBody: 'Premium members get priority invitations and guaranteed places in the most coveted venues.',
        becomePremium: 'Become Premium'
      }
    : {
        confirmedTitle: 'Inscription confirmee',
        confirmedBody: 'Votre place est réservée. Preparez votre plus belle tenue !',
        linkCopied: 'Lien copie',
        linkCopiedBody: 'La sortie a ete copiee.',
        loading: "Consultation de l'Agenda Royal...",
        eyebrow: 'Evenements de Prestige',
        titlePrefix: 'Agenda',
        subtitle: "Eclat, sorties exclusives et rencontres d'exception selectionnees pour vous.",
        filters: [
          { id: 'ALL', label: 'Tout' },
          { id: 'EVENT', label: 'Evenements' },
          { id: 'PARTY', label: 'Soirees' },
          { id: 'FLASH_OFFER', label: 'Offres Flash' },
          { id: 'NETWORKING', label: 'Networking' },
          { id: 'LIVE_MUSIC', label: 'Live Music' }
        ],
        cityFilter: 'Filtrer par ville',
        emptyTitle: 'Aucun evenement prevu',
        emptyBody: 'Revenez bientot pour decouvrir les prochaines sorties du Cercle Galant.',
        refresh: 'Rafraichir',
        cityMissing: 'Ville non definie',
        officialSource: 'Source officielle',
        hostVenue: 'Etablissement Hote',
        ticketing: 'BILLETTERIE TIKERAMA',
        attending: "J'Y SERAI",
        reserve: 'RESERVER MA PLACE',
        eliteTitle: "Accédez a l'Elite Galante",
        eliteBody: 'Les membres Premium bénéficient d invitations prioritaires et de places garanties dans les lieux les plus convoites.',
        becomePremium: 'Devenir Premium'
      };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ events: AgendaEvent[] }>('/api/venues/agenda', { requireAuth: true });
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAttendToggle = async (eventId: string, isCurrentlyAttending: boolean) => {
    try {
      const endpoint = isCurrentlyAttending ? 'unattend' : 'attend';
      await apiRequest(`/api/venues/agenda/${eventId}/${endpoint}`, {
        method: 'POST',
        requireAuth: true
      });

      setEvents(prev => prev.map(ev => {
        if (ev.id === eventId) {
          return {
            ...ev,
            is_attending: !isCurrentlyAttending,
            attendees_count: isCurrentlyAttending ? ev.attendees_count - 1 : ev.attendees_count + 1
          };
        }
        return ev;
      }));

      if (!isCurrentlyAttending) {
        showAlert(labels.confirmedTitle, `${labels.confirmedBody} ✨`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareEvent = async (event: AgendaEvent) => {
    const url = event.external_ticket_url || event.source_url || `${window.location.origin}/agenda`;
    const text = `${event.title} - ${event.venues?.name || 'Galant'}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showAlert(labels.linkCopied, labels.linkCopiedBody);
      }
    } catch {}
  };

  const openExternalEvent = (event: AgendaEvent) => {
    const url = event.external_ticket_url || event.source_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'ALL') return true;
    return e.event_type === filter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="text-primary/40 animate-pulse" size={32} />
          </div>
        </div>
        <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{labels.loading}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 space-y-12">
      {/* Sophisticated Hero Header */}
      <div className="relative rounded-[4rem] overflow-hidden bg-slate-950 dark:bg-black min-h-[400px] flex items-center shadow-2xl">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200"
            className="w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-[5000ms]"
            alt="Agenda Hero"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent"></div>
        </div>

        <div className="relative z-10 p-12 md:p-20 space-y-8 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
              <Sparkles size={24} className="text-amber-400 animate-pulse" />
            </div>
            <span className="text-amber-400/80 font-medium uppercase tracking-prestige text-[10px]">
              {labels.eyebrow}
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-serif italic tracking-tighter text-white leading-none">
            {labels.titlePrefix} <span className="text-primary not-italic">Galant</span>
          </h2>

          <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-md">
            {labels.subtitle}
          </p>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between sticky top-24 z-40">
        <div className="flex gap-2 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/40 dark:shadow-none w-full lg:w-auto overflow-x-auto no-scrollbar">
          {labels.filters.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-8 py-3 rounded-2xl font-medium text-[10px] uppercase tracking-prestige transition-all whitespace-nowrap ${
                filter === cat.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3 text-slate-400 dark:text-slate-500 font-medium text-xs uppercase tracking-prestige bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-6 py-4 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none">
           <Filter size={16} className="text-primary" />
           <span>{labels.cityFilter}</span>
           <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10 mx-2"></div>
           <span className="text-slate-900 dark:text-white">Douala, Yaoundé</span>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-white/5 p-12 space-y-8 animate-in fade-in duration-700">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700">
            <Calendar size={48} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mb-2">{labels.emptyTitle}</p>
            <p className="text-slate-400 dark:text-slate-500 font-medium max-w-sm mx-auto">{labels.emptyBody}</p>
          </div>
          <button
            onClick={fetchEvents}
            className="bg-primary text-white font-black text-xs uppercase tracking-[0.2em] px-10 py-5 rounded-2xl shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            {labels.refresh}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
          {filteredEvents.map((event) => {
            const isExternalEvent = event.is_external || event.source === 'TIKERAMA' || !!event.external_ticket_url;
            return (
            <div
              key={event.id}
              className="group bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] dark:shadow-none border border-slate-100 dark:border-white/10 overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] dark:hover:shadow-none hover:-translate-y-1"
            >
              {/* Image Section - Half Width */}
              <div className="relative w-full md:w-2/5 aspect-square md:aspect-auto overflow-hidden">
                <OptimizedImage
                  src={optimizedPhotoUrl(event.photo_url, event.photo_variants, 'medium') || 'https://placehold.co/600x800'}
                  className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-110"
                  alt={event.title}
                />

                {/* Date Floating Badge */}
                <div className="absolute top-6 left-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center min-w-[65px] shadow-2xl border border-white/50 dark:border-white/10">
                  <span className="text-[10px] font-black text-primary leading-none mb-1 tracking-widest uppercase">
                    {new Date(event.starts_at).toLocaleDateString('fr-FR', { month: 'short' })}
                  </span>
                  <span className="text-3xl font-black text-slate-950 dark:text-white leading-none">
                    {new Date(event.starts_at).getDate()}
                  </span>
                </div>

                {/* Event Type Ribbon */}
                <div className={`absolute bottom-6 left-6 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 backdrop-blur-md border border-white/20 ${
                  event.event_type === 'FLASH_OFFER' ? 'bg-amber-400 text-black' : 'bg-slate-950/80 dark:bg-black/80 text-white'
                }`}>
                  {event.event_type === 'FLASH_OFFER' ? <Zap size={12} fill="currentColor" /> : <Star size={12} fill="currentColor" />}
                  {event.event_type}
                </div>
              </div>

              {/* Content Section - Half Width */}
              <div className="p-8 md:p-10 flex-1 flex flex-col space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-medium text-[10px] uppercase tracking-prestige">
                    <MapPin size={12} className="text-primary" />
                    <span>{event.venues?.city || labels.cityMissing}</span>
                  </div>
                  <h3 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  {isExternalEvent && (
                    <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      <ExternalLink size={12} />
                      {event.source_label || 'Billetterie via TIKERAMA'}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100/50 dark:border-white/5">
                  <OptimizedImage src={optimizedPhotoUrl(event.venues?.photo_url, event.venues?.photo_variants, 'thumb')} className="w-10 h-10 rounded-xl shadow-sm border border-white dark:border-slate-700" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{isExternalEvent ? labels.officialSource : labels.hostVenue}</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{event.venues?.name}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-700" />
                </div>

                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed line-clamp-3">
                  {event.description}
                </p>

                <div className="flex items-center justify-between py-4 border-y border-slate-50 dark:border-white/5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase">
                      <Clock size={16} className="text-primary" />
                      <span>{new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {event.price_label && (
                      <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase mt-2">
                        <Ticket size={16} />
                        <span>{event.price_label}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-sm">
                        <OptimizedImage src={`https://i.pravatar.cc/100?img=${event.id.length + i}`} alt="Attendee" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                      +{event.attendees_count || 0}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isExternalEvent) {
                        openExternalEvent(event);
                        return;
                      }
                      handleAttendToggle(event.id, event.is_attending);
                    }}
                    className={`flex-1 py-5 rounded-2xl font-medium text-[10px] uppercase tracking-prestige transition-all flex items-center justify-center gap-3 shadow-xl ${
                      event.is_attending
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-primary border border-rose-100 dark:border-rose-900/30 shadow-rose-500/5'
                        : 'bg-slate-950 dark:bg-white text-white dark:text-slate-900 shadow-slate-950/10 dark:shadow-none hover:bg-black dark:hover:bg-slate-100 active:scale-95'
                    }`}
                  >
                    {isExternalEvent ? <ExternalLink size={18} /> : event.is_attending ? <CheckCircle size={18} fill="currentColor" className="opacity-40" /> : <Ticket size={18} />}
                    {isExternalEvent ? labels.ticketing : event.is_attending ? labels.attending : labels.reserve}
                  </button>

                  <button onClick={() => void handleShareEvent(event)} className="w-16 py-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* VIP Exclusive Offer Card */}
      <div className="relative rounded-[4rem] bg-gradient-to-br from-slate-900 to-black p-12 md:p-20 text-center overflow-hidden shadow-2xl group">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-1000"></div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-center text-amber-400 shadow-2xl">
              <Trophy size={40} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl md:text-5xl font-serif italic tracking-tighter text-white">{labels.eliteTitle}</h3>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              {labels.eliteBody}
            </p>
          </div>
          <button className="bg-primary text-white px-12 py-5 rounded-[2rem] font-medium text-xs uppercase tracking-prestige shadow-2xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all">
            {labels.becomePremium}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgendaPage;
