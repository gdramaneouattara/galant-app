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
      <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10">
        <h2 className="text-3xl font-black mb-4">Devenir Partenaire Galant</h2>
        <p className="text-slate-500 mb-8">Boostez la visibilité de votre établissement auprès d'une clientèle d'exception.</p>
        <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all">
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
          <h2 className="text-3xl font-black italic text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="text-primary" />
            Espace Partenaire
          </h2>
          <p className="text-slate-500 font-medium mt-1">Gérez votre établissement {venue?.name}</p>
        </div>
        <button
          onClick={() => navigate('/partner/create-event')}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-red-100 hover:scale-105 active:scale-95 transition-all"
        >
          <PlusCircle size={18} />
          CRÉER UN ÉVÉNEMENT
        </button>
      </div>

      {/* Statistiques Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <span className="block text-3xl font-black text-slate-900">1,284</span>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Vues du profil</span>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
            <Star size={24} fill="currentColor" />
          </div>
          <span className="block text-3xl font-black text-slate-900">4.8</span>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Note moyenne</span>
        </div>
        <div
          onClick={() => navigate('/partner/chats')}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare size={24} />
          </div>
          <span className="block text-3xl font-black text-slate-900">12</span>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
            Messages Clients
            <ChevronRight size={14} className="text-primary" />
          </span>
        </div>
      </div>

      {/* Grid Contenu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mon Établissement */}
        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="h-48 bg-slate-200 relative">
            <img src={venue?.photo_url || 'https://placehold.co/600x300'} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-6 text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">{venue?.name || 'Mon Établissement'}</h3>
              <div className="flex items-center gap-1 text-sm font-bold opacity-90">
                <MapPin size={14} />
                <span>{venue?.city || 'Douala, Cameroun'}</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <button className="w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors uppercase tracking-widest">
              Modifier ma fiche
            </button>
          </div>
        </section>

        {/* Événements à venir */}
        <section className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black italic flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Mes Événements
            </h3>
            <span className="text-xs font-black text-slate-400">VOIR TOUT</span>
          </div>

          <div className="space-y-4">
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase">JUIL</span>
                 <span className="text-lg font-black text-slate-900 leading-none">24</span>
               </div>
               <div className="flex-1">
                 <p className="font-bold text-slate-900">Soirée Mascarade</p>
                 <p className="text-xs text-slate-500 font-medium">À partir de 21:00</p>
               </div>
               <ChevronRight className="text-slate-300" size={16} />
             </div>

             <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-[2rem]">
               <p className="text-sm text-slate-400 font-medium">Aucun autre événement programmé.</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

import { ChevronRight } from 'lucide-react';
export default PartnerDashboard;
