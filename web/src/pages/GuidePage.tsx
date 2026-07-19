import React, { useEffect, useState } from 'react';
import { apiRequest } from '@shared/lib/api';
import { MapPin, Star, Utensils, GlassWater, Sparkles, ChevronRight, Info, Send, MessageCircle, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProposeVenueModal from '../components/ProposeVenueModal';

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
  const { t } = useAuth();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        // On récupère les lieux approuvés
        const data = await apiRequest<{ venues: Venue[] }>('/api/venues', { requireAuth: true });

        // Si la liste est vide, on injecte du contenu éditorial de prestige (Contenu d'Appel)
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

  const handleContactVenue = async (venueId: string, venueName: string) => {
    // On vérifie si l'utilisateur est éligible sans appeler l'API pour une UX plus fluide
    if (!profile?.is_premium && !profile?.is_vip && (profile?.roses_count || 0) < 1) {
      showAlert('Accès Conciergerie', 'Le chat direct avec les établissements est un privilège Premium. Vous pouvez également débloquer cet accès pour 1 Rose d\'Or.');
      navigate('/premium');
      return;
    }

    const confirmMsg = !profile?.is_premium && !profile?.is_vip
      ? `Souhaitez-vous utiliser 1 Rose d'Or pour ouvrir une discussion avec ${venueName} ?`
      : null;

    if (confirmMsg && !window.confirm(confirmMsg)) return;

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
    // Dans une version finale, on récupèrerait les points GPS du lieu
    // Ici on prépare le lien profond vers l'app Yango
    const yangoUrl = `https://yango.com/action/order?end_lat=4.05&end_lon=9.7&name=${encodeURIComponent(venue.name)}`;
    window.open(yangoUrl, '_blank');
    showAlert('Yango', 'Redirection vers Yango pour commander votre chauffeur Premium.');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-10">
      {/* Hero Section du Guide */}
      <div className="relative rounded-[3rem] overflow-hidden bg-slate-900 text-white p-10 md:p-16 shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-lg">
          <span className="bg-primary/20 text-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/30">
            L'Expertise Galant
          </span>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-tight">
            Les adresses les plus chics de votre ville.
          </h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            Notre équipe sélectionne pour vous les lieux les plus propices à une rencontre d'exception.
          </p>
        </div>
        <Sparkles className="absolute right-10 bottom-10 text-white/5 w-64 h-64 -rotate-12" />
      </div>

      {/* Grid des Lieux */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-xl font-black italic">Le Guide Galant</h3>
          <div className="flex gap-2">
            <button className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl hover:text-primary transition-all"><Utensils size={18} /></button>
            <button className="p-3 bg-white shadow-sm border border-slate-100 rounded-2xl hover:text-primary transition-all"><GlassWater size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
          {venues.map((venue) => (
            <div key={venue.id} className="group bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 overflow-hidden hover:scale-[1.02] transition-all cursor-pointer">
              <div className="relative h-56">
                <img src={venue.photo_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />

                {/* Badge Editorial vs Partenaire */}
                <div className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 ${
                  venue.is_editorial ? 'bg-slate-900/80 text-white backdrop-blur-md' : 'bg-primary text-white'
                }`}>
                  {venue.is_editorial ? <Info size={12} /> : <Star size={12} fill="currentColor" />}
                  {venue.is_editorial ? 'Conseil Galant' : 'Partenaire'}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                   <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-black uppercase tracking-tighter mb-1">
                     <MapPin size={10} className="text-primary" />
                     {venue.city}
                   </div>
                   <h4 className="text-xl font-black text-white leading-none">{venue.name}</h4>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {venue.description}
                </p>

                {venue.benefit_description && (
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 flex items-center gap-3">
                    <span className="text-lg">🎁</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter leading-tight">
                      {venue.benefit_description}
                    </span>
                  </div>
                )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSelectedVenue(venue);
                        setIsModalOpen(true);
                      }}
                      className="py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-slate-200"
                    >
                      <Send size={14} />
                      Proposer
                    </button>
                    <button
                      onClick={() => handleYangoRide(venue)}
                      className="py-4 rounded-2xl bg-teal-50 border-2 border-teal-100 text-teal-700 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-100 transition-all shadow-sm"
                    >
                      <Car size={14} />
                      Yango
                    </button>
                    <button
                      onClick={() => handleContactVenue(venue.id, venue.name)}
                      className="py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <MessageCircle size={14} className="text-primary" />
                      Chat Direct
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de proposition */}
        <ProposeVenueModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          venue={selectedVenue}
        />

      {/* Call to Action Business */}
      <div className="mx-4 bg-amber-50 rounded-[3rem] border border-amber-100 p-10 text-center space-y-4">
         <h3 className="text-xl font-black text-amber-900 italic">Vous possédez un lieu d'exception ?</h3>
         <p className="text-amber-700/70 text-sm font-medium max-w-sm mx-auto">Rejoignez le Guide Galant et devenez la destination préférée de nos membres.</p>
         <button className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200 hover:scale-105 transition-all">
           Inscrire mon établissement
         </button>
      </div>
    </div>
  );
};

export default GuidePage;
