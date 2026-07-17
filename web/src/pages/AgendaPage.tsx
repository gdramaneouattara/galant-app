import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { Calendar, MapPin, Zap, ChevronRight, Clock, Star, Users, CheckCircle } from 'lucide-react';

interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  photo_url: string;
  event_type: 'PARTY' | 'FLASH_OFFER' | 'NETWORKING' | 'LIVE_MUSIC';
  starts_at: string;
  expires_at: string;
  attendees_count: number;
  is_attending: boolean;
  venues: {
    name: string;
    city: string;
    photo_url: string;
  } | null;
}

const AgendaPage: React.FC = () => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PARTY' | 'FLASH_OFFER'>('ALL');

  const fetchEvents = async () => {
    try {
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
      // Mise à jour locale pour une UX instantanée
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
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'ALL') return true;
    return e.event_type === filter;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Chargement de l'élégance...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tight text-slate-900">Agenda Galant</h2>
          <p className="text-slate-500 font-medium mt-1 text-lg">Les soirées et offres d'exception près de vous.</p>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            TOUT
          </button>
          <button
            onClick={() => setFilter('PARTY')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${filter === 'PARTY' ? 'bg-primary text-white shadow-lg shadow-red-100' : 'text-slate-500 hover:text-slate-700'}`}
          >
            SOIRÉES
          </button>
          <button
            onClick={() => setFilter('FLASH_OFFER')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${filter === 'FLASH_OFFER' ? 'bg-accent text-white shadow-lg shadow-amber-100' : 'text-slate-500 hover:text-slate-700'}`}
          >
            OFFRES
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">Aucun événement prévu pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((event) => (
            <div key={event.id} className="group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden hover:scale-[1.02] transition-all cursor-pointer">
              <div className="relative aspect-video">
                <img src={event.photo_url || 'https://placehold.co/600x400'} className="w-full h-full object-cover" alt="" />

                {/* Badge Type */}
                <div className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
                  event.event_type === 'FLASH_OFFER' ? 'bg-accent text-white' : 'bg-primary text-white'
                }`}>
                  {event.event_type === 'FLASH_OFFER' ? <Zap size={12} fill="currentColor" /> : <Star size={12} fill="currentColor" />}
                  {event.event_type}
                </div>

                {/* Date Badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl p-2 flex flex-col items-center justify-center min-w-[50px] shadow-lg">
                  <span className="text-[10px] font-black text-slate-400 leading-none">{new Date(event.starts_at).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</span>
                  <span className="text-xl font-black text-slate-900 leading-none">{new Date(event.starts_at).getDate()}</span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                <div className="absolute bottom-4 left-6 right-6 text-white">
                  <h3 className="text-xl font-black leading-tight truncate">{event.title}</h3>
                  <div className="flex items-center gap-2 mt-1 opacity-90">
                    <img src={event.venues?.photo_url} className="w-5 h-5 rounded-full border border-white/50" alt="" />
                    <span className="text-xs font-bold truncate uppercase tracking-tighter">{event.venues?.name}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-center min-w-[60px] border border-slate-100">
                    <span className="block text-sm font-black text-slate-900">{event.attendees_count || 0}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inscrits</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAttendToggle(event.id, event.is_attending); }}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      event.is_attending
                        ? 'bg-primary/10 text-primary border-2 border-primary/20'
                        : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-black active:scale-95'
                    }`}
                  >
                    {event.is_attending ? <CheckCircle size={16} /> : <Users size={16} />}
                    {event.is_attending ? 'J\'Y SERAI' : 'JE PARTICIPE'}
                  </button>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-black uppercase">{new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin size={14} />
                        <span className="text-[10px] font-black uppercase truncate max-w-[80px]">{event.venues?.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgendaPage;
