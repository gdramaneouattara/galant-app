import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, COLLECTIONS } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { LayoutDashboard, Calendar, MessageSquare, TrendingUp, MapPin, Star, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartnerVenue = async () => {
      if (!profile?.id) return;
      try {
        const q = query(collection(db, COLLECTIONS.VENUES), where('owner_id', '==', profile.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setVenue({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPartnerVenue();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-20 animate-pulse"><div className="h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  if (!profile?.is_partner) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl dark:shadow-none border border-slate-100 dark:border-white/10 p-10 transition-colors">
        <h2 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">Devenir Partenaire Galant</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 transition-colors">Boostez la visibilité de votre établissement auprès d'une clientèle d'exception.</p>
        <button
          onClick={() => navigate('/partner-signup')}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-2xl font-bold hover:bg-black dark:hover:bg-slate-100 transition-all"
        >
          Soumettre mon établissement
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-sans  tracking-tighter text-slate-900 dark:text-white flex items-center gap-3 transition-colors">
            <LayoutDashboard className="text-primary" />
            Espace Partenaire
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Gérez votre établissement {venue?.name}</p>
            <button
              onClick={() => navigate('/partner-premium')}
              className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
            >
              Gérer l'abonnement
            </button>
          </div>
        </div>
        <button
          onClick={() => navigate('/partner/create-event')}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-medium text-sm uppercase tracking-prestige shadow-lg shadow-red-100 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
        >
          <PlusCircle size={18} />
          CRÉER UN ÉVÉNEMENT
        </button>
      </div>

      {/* Statistiques Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-white/5 transition-colors">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mb-4 transition-colors">
            <TrendingUp size={24} />
          </div>
          <span className="block text-3xl font-black text-slate-900 dark:text-white transition-colors">1,284</span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">Vues du profil</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-white/5 transition-colors">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center mb-4 transition-colors">
            <Star size={24} fill="currentColor" />
          </div>
          <span className="block text-3xl font-black text-slate-900 dark:text-white transition-colors">4.8</span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">Note moyenne</span>
        </div>
        <div
          onClick={() => navigate('/partner/chats')}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-white/5 cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center mb-4 transition-colors">
            <MessageSquare size={24} />
          </div>
          <span className="block text-3xl font-black text-slate-900 dark:text-white transition-colors">12</span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige flex items-center justify-between transition-colors">
            Messages Clients
            <ChevronRight size={14} className="text-primary" />
          </span>
        </div>
      </div>

      {/* Grid Contenu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mon Établissement */}
        <section className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 overflow-hidden transition-colors">
          <div className="h-48 bg-slate-200 dark:bg-slate-800 relative transition-colors">
            <img src={venue?.photo_url || 'https://placehold.co/600x300'} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-6 text-white">
              <h3 className="text-xl font-sans  tracking-tighter uppercase">{venue?.name || 'Mon Établissement'}</h3>
              <div className="flex items-center gap-1 text-sm font-bold opacity-90">
                <MapPin size={14} />
                <span>{venue?.city || 'Douala, Cameroun'}</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <button className="w-full py-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-medium text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors uppercase tracking-prestige">
              Modifier ma fiche
            </button>
          </div>
        </section>

        {/* Événements à venir */}
        <section className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5 p-8 transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-sans  tracking-tighter flex items-center gap-2 text-slate-900 dark:text-white transition-colors">
              <Calendar className="text-primary" size={20} />
              Mes Événements
            </h3>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-prestige transition-colors">VOIR TOUT</span>
          </div>

          <div className="space-y-4">
             <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center gap-4 transition-colors">
               <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex flex-col items-center justify-center transition-colors">
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">JUIL</span>
                 <span className="text-lg font-black text-slate-900 dark:text-white leading-none">24</span>
               </div>
               <div className="flex-1">
                 <p className="font-bold text-slate-900 dark:text-white transition-colors">Soirée Mascarade</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors">À partir de 21:00</p>
               </div>
               <ChevronRight className="text-slate-300 dark:text-slate-700" size={16} />
             </div>

             <div className="text-center py-4 border-2 border-dashed border-slate-100 dark:border-white/10 rounded-[2rem] transition-colors">
               <p className="text-sm text-slate-400 dark:text-slate-500 font-medium transition-colors">Aucun autre événement programmé.</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PartnerDashboard;
