// Force re-process for Globe icon
import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { MapPin, Star, Utensils, GlassWater, Sparkles, ChevronRight, Info, Send, MessageCircle, Car, Compass, Search, Heart, Trophy, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProposeVenueModal from '../components/ProposeVenueModal';
import { showAlert } from '@shared/lib/ui-bridge';

interface Venue {
  id: string;
  name: string;
  description: string;
  photo_url: string;
  venue_type: 'RESTAURANT' | 'LOUNGE' | 'HOTEL';
  city: string;
  benefit_description?: string;
  is_editorial?: boolean;
}

const GuidePage: React.FC = () => {
  const { profile, t } = useAuth();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'RESTAURANT' | 'LOUNGE' | 'HOTEL'>('ALL');

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const data = await apiRequest<{ venues: Venue[] }>('/api/venues', { requireAuth: true });

        if (!data.venues || data.venues.length === 0) {
          setVenues([
            {
              id: 'ed-1',
              name: 'Sky Lounge Akwa',
              description: 'La plus belle vue sur le Wouri. Un incontournable pour un cocktail au coucher du soleil.',
              photo_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800',
              venue_type: 'LOUNGE',
              city: 'Douala',
              benefit_description: 'Table prioritaire pour les membres Galant',
              is_editorial: true
            },
            {
              id: 'ed-2',
              name: 'Le Bistro Bastos',
              description: 'Une ambiance feutrée et une cuisine raffinée. Idéal pour un premier dîner en toute intimité.',
              photo_url: 'https://images.unsplash.com/photo-1550966842-2849a2244831?q=80&w=800',
              venue_type: 'RESTAURANT',
              city: 'Yaoundé',
              benefit_description: 'Apéritif de bienvenue offert',
              is_editorial: true
            },
            {
              id: 'ed-3',
              name: 'Hôtel Hilton Garden',
              description: 'Le luxe discret. Un cadre d\'exception pour des rencontres qui marquent les esprits.',
              photo_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800',
              venue_type: 'HOTEL',
              city: 'Yaoundé',
              is_editorial: true
            }
          ]);
        } else {
          setVenues(data.venues);
        }
      } catch (error) {
        console.error('Error fetching guide:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const filteredVenues = venues.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || v.venue_type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactVenue = async (venueId: string, venueName: string) => {
    if (!profile?.is_premium && !profile?.is_vip && (profile?.roses_count || 0) < 1) {
      showAlert('Accès Conciergerie', 'Le chat direct avec les établissements est un privilège Premium.');
      navigate('/premium');
      return;
    }

    try {
      const res = await apiRequest<{ venueChatId: string }>('/api/messages/venue-thread', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ venueId })
      });
      navigate(`/chat/${res.venueChatId}?type=venue`);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible d\'ouvrir la discussion.');
    }
  };

  const handleYangoRide = (venue: Venue) => {
    const yangoUrl = `https://yango.com/action/order?end_lat=4.05&end_lon=9.7&name=${encodeURIComponent(venue.name)}`;
    window.open(yangoUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sélection des meilleures adresses...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 space-y-12">
      {/* Hero Header Ultra Premium */}
      <div className="relative rounded-[4rem] overflow-hidden shadow-2xl bg-slate-950 min-h-[450px] flex items-center group">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200"
            className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-[5000ms]"
            alt="Hero"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
        </div>

        <div className="relative z-10 p-12 md:p-20 space-y-8 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Compass size={24} className="text-white animate-pulse" />
            </div>
            <span className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px]">
              Expérience Galante
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter leading-none">
            Le Guide <span className="text-primary not-italic">Privilège</span>
          </h2>

          <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed">
            Découvrez notre sélection exclusive de lieux d'exception pour des rendez-vous inoubliables.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
              <Trophy size={20} className="text-amber-500" />
              <span className="text-white text-xs font-black uppercase tracking-widest">Lieux Certifiés</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
              <Sparkles size={20} className="text-primary" />
              <span className="text-white text-xs font-black uppercase tracking-widest">Avantages Membres</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between sticky top-24 z-40 bg-slate-50/80 backdrop-blur-lg p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="relative flex-1 w-full group">
          <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Rechercher un lieu, une ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar w-full md:w-auto">
          {[
            { id: 'ALL', label: 'Tous', icon: Globe },
            { id: 'RESTAURANT', label: 'Restaurants', icon: Utensils },
            { id: 'LOUNGE', label: 'Lounges', icon: GlassWater },
            { id: 'HOTEL', label: 'Hotels', icon: Star }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeCategory === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid des Lieux - Design Magazine */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredVenues.map((venue) => (
          <div key={venue.id} className="group bg-white rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden hover:scale-[1.02] transition-all duration-500 flex flex-col">
            <div className="relative h-72 overflow-hidden">
              <img
                src={venue.photo_url}
                className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110"
                alt={venue.name}
              />

              {/* Overlay Gradient App-Style */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              <div className="absolute top-6 left-6 flex flex-col gap-2">
                <div className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 border border-white/20 backdrop-blur-md ${
                  venue.is_editorial ? 'bg-slate-950/80 text-white' : 'bg-primary text-white'
                }`}>
                  {venue.is_editorial ? <Sparkles size={12} className="text-amber-400" /> : <Trophy size={12} className="text-amber-400" />}
                  {venue.is_editorial ? 'Conseil Galant' : 'Élite Certifié'}
                </div>
              </div>

              <div className="absolute bottom-6 left-8 right-8">
                <div className="flex items-center gap-2 text-primary-light font-black text-[10px] uppercase tracking-[0.2em] mb-2">
                  <MapPin size={12} className="text-primary" />
                  <span className="text-white/80">{venue.city}</span>
                </div>
                <h4 className="text-3xl font-black text-white tracking-tighter leading-none">{venue.name}</h4>
              </div>
            </div>

            <div className="p-8 space-y-8 flex-1 flex flex-col">
              <p className="text-slate-500 font-medium text-base leading-relaxed line-clamp-3">
                {venue.description}
              </p>

              {venue.benefit_description && (
                <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 p-5 rounded-[2rem] border border-rose-100 flex items-start gap-4 shadow-inner">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">🎁</div>
                  <div>
                    <p className="text-[8px] font-black text-rose-300 uppercase tracking-widest mb-1">Privilège Membre</p>
                    <p className="text-xs font-black text-primary uppercase tracking-tight leading-tight">
                      {venue.benefit_description}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-auto space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setSelectedVenue(venue); setIsModalOpen(true); }}
                    className="py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 group/btn"
                  >
                    <Send size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    Proposer
                  </button>
                  <button
                    onClick={() => handleYangoRide(venue)}
                    className="py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
                  >
                    <Car size={16} />
                    Yango
                  </button>
                </div>

                <button
                  onClick={() => handleContactVenue(venue.id, venue.name)}
                  className="w-full py-5 rounded-2xl bg-rose-50 border border-rose-100 text-primary font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-primary hover:text-white transition-all group/chat active:scale-95 shadow-lg shadow-rose-500/5"
                >
                  <MessageCircle size={18} fill="currentColor" className="opacity-20 group-hover/chat:opacity-100 transition-opacity" />
                  Accès Conciergerie
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Partenariat - Design Épuré */}
      <div className="relative rounded-[4rem] bg-gradient-to-br from-amber-400 to-amber-600 p-12 md:p-20 text-center overflow-hidden shadow-2xl shadow-amber-500/20 group">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h3 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">Votre lieu mérite l'excellence</h3>
          <p className="text-white/80 text-lg font-medium">Rejoignez le cercle restreint des établissements certifiés Galant.</p>
          <button className="bg-white text-amber-600 px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all mt-4">
            Inscrire mon établissement
          </button>
        </div>
      </div>

      <ProposeVenueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        venue={selectedVenue}
      />
    </div>
  );
};

export default GuidePage;
