import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Sparkles,
  Building2,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

const AdminVenues: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const fetchAdminVenues = async () => {
    try {
      setLoading(true);
      // Assuming a direct admin endpoint for all venues
      const res = await apiRequest<{ venues: any[] }>('/api/venues', { requireAuth: true });
      setVenues(res.venues || []);
    } catch (e: any) {
      showAlert('Erreur', 'Échec du chargement des partenaires.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminVenues();
  }, []);

  const handleUpdateStatus = async (venueId: string, newStatus: string) => {
    try {
      await apiRequest(`/api/admin/venues/${venueId}/status`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ status: newStatus })
      });
      showAlert('Succès', `L'établissement a été ${newStatus === 'APPROVED' ? 'approuvé' : 'rejeté'}.`);
      fetchAdminVenues();
    } catch (e: any) {
      showAlert('Erreur', e.message);
    }
  };

  const filtered = venues.filter(v => v.status === filter);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-sans  tracking-tighter text-slate-900 dark:text-white sm:text-4xl">Guide & Partenaires</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">Validez et gérez le prestige du catalogue Galant.</p>
        </div>

        <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm overflow-x-auto no-scrollbar">
          {[
            { id: 'PENDING', label: 'En attente' },
            { id: 'APPROVED', label: 'Approuvés' },
            { id: 'REJECTED', label: 'Refusés' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                filter === cat.id ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-slate-300" size={40} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5 p-12 space-y-6">
          <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-200">
            <Building2 size={40} />
          </div>
          <p className="text-xl font-sans  text-slate-900 dark:text-white">Aucun partenaire dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((venue) => (
            <div key={venue.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 space-y-6 group">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  <img src={venue.photo_url || 'https://placehold.co/200x200'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-sans  tracking-tighter text-slate-900 dark:text-white truncate">{venue.name}</h3>
                    <div className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {venue.venue_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                    <MapPin size={12} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{venue.city}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2">{venue.description}</p>
                </div>
              </div>

              <div className="bg-rose-50/50 dark:bg-rose-500/5 p-4 rounded-2xl border border-rose-100 dark:border-rose-500/10">
                 <div className="flex items-center gap-2 mb-1">
                   <Sparkles size={12} className="text-primary" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-primary">Avantage Membre</span>
                 </div>
                 <p className="text-xs font-bold text-rose-900 dark:text-rose-100">{venue.benefit_description || 'Aucun avantage renseigné.'}</p>
              </div>

              <div className="flex gap-3 pt-2">
                {venue.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(venue.id, 'APPROVED')}
                      className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-prestige shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(venue.id, 'REJECTED')}
                      className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-prestige active:scale-95 transition-all"
                    >
                      Rejeter
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(venue.id, 'PENDING')}
                    className="w-full py-4 border-2 border-slate-100 dark:border-white/5 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-prestige active:scale-95 transition-all"
                  >
                    Passer en attente
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVenues;
