import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Crown, Gem, Rocket, Star, CheckCircle2,
  Zap, ShieldCheck, EyeOff, MessageSquare,
  ChevronRight, ArrowRight, Sparkles
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

const PremiumPage: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (type: string, id: string, amount: number) => {
    setLoading(id);
    try {
      // Appel à l'API de paiement (Paystack)
      const res = await apiRequest<{ checkoutUrl: string }>('/api/payments/create-session', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ type, id, amount })
      });

      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (error: any) {
      showAlert('Erreur', error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-[3rem] overflow-hidden bg-slate-900 text-white p-10 md:p-20 shadow-2xl text-center">
        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-500 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-amber-500/30">
            <Crown size={16} />
            Expérience Privilège
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter leading-tight">
            L'Élégance n'a pas de <span className="text-primary">limites.</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            Rejoignez le cercle fermé des membres certifiés et multipliez vos chances de rencontres d'exception.
          </p>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-[120px]"></div>
           <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500 rounded-full blur-[120px]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* SECTION 1: ABONNEMENTS */}
        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-2xl font-black italic flex items-center gap-3">
            <Gem className="text-primary" /> Nos Abonnements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Mensuel */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col justify-between hover:scale-[1.02] transition-all">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter">Standard</h4>
                  <p className="text-slate-400 font-bold text-xs">Mensuel</p>
                </div>
                <div className="text-4xl font-[900] text-slate-900">5 000 F <span className="text-sm text-slate-400 font-bold">/mois</span></div>
                <ul className="space-y-3">
                  {['Swipes illimités', 'Badge certifié 💎', 'Voir qui vous like', 'Chat Partenaires gratuit'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <CheckCircle2 size={16} className="text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handlePurchase('PLAN', 'MONTHLY', 5000)}
                disabled={!!loading}
                className="mt-8 w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                {loading === 'MONTHLY' ? '...' : 'S\'abonner'} <ArrowRight size={14} />
              </button>
            </div>

            {/* Plan Trimestriel */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-4 border-primary/30 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">Le plus prisé</div>
              <div className="space-y-6 relative z-10">
                <div>
                  <h4 className="text-xl font-black uppercase tracking-tighter text-white">Privilège</h4>
                  <p className="text-primary font-bold text-xs">3 Mois</p>
                </div>
                <div className="text-4xl font-[900] text-white">10 000 F <span className="text-sm text-slate-500 font-bold">/total</span></div>
                <ul className="space-y-3">
                  {['Tous les avantages Standard', 'Mode Invisible (Discrétion)', '3 Roses d\'Or offertes', 'Priorité de modération'].map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium text-slate-300">
                      <CheckCircle2 size={16} className="text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handlePurchase('PLAN', 'QUARTERLY', 10000)}
                disabled={!!loading}
                className="mt-8 w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                {loading === 'QUARTERLY' ? '...' : 'Choisir ce plan'} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: BOUTIQUE DE ROSES */}
        <div className="space-y-8">
          <h3 className="text-2xl font-black italic flex items-center gap-3">
            <span className="text-2xl">🌹</span> Rose Shop
          </h3>
          <div className="bg-amber-50 rounded-[3rem] p-8 border border-amber-100 space-y-6">
            <div className="text-center space-y-2 mb-8">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">Votre Solde Actuel</p>
               <div className="text-4xl font-black text-amber-900">{profile?.roses_count || 0} Roses</div>
            </div>

            <div className="space-y-4">
              {[
                { id: 'rose_1', label: '1 Rose d\'Or', sub: 'Super Like / Note', price: 500 },
                { id: 'rose_5', label: 'Pack Découverte', sub: '5 Roses d\'Or', price: 2500 },
                { id: 'rose_10', label: 'Pack Passion', sub: '10 Roses d\'Or', price: 5000 },
                { id: 'golden_rose', label: 'Golden Rose 🏆', sub: 'Cadeau de Prestige', price: 2500 },
              ].map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase('ROSE_PACK', pack.id, pack.price)}
                  disabled={!!loading}
                  className="w-full bg-white p-4 rounded-2xl flex items-center justify-between group hover:shadow-lg transition-all border border-amber-200/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                       {pack.id === 'golden_rose' ? '🏆' : '🌹'}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-900 leading-none">{pack.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{pack.sub}</p>
                    </div>
                  </div>
                  <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black">
                    {pack.price} F
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: BOOSTS */}
        <div className="lg:col-span-3 space-y-8">
          <h3 className="text-2xl font-black italic flex items-center gap-3">
            <Rocket className="text-purple-500" /> Boosts de Visibilité
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'boost_1d', label: '1 Jour', price: 1000, color: 'bg-blue-500', sub: 'Parfait pour ce soir' },
              { id: 'boost_3d', label: '3 Jours', price: 2500, color: 'bg-purple-500', sub: 'Dominez le weekend' },
              { id: 'boost_7d', label: '7 Jours', price: 5000, color: 'bg-indigo-500', sub: 'Visibilité maximale' },
            ].map((boost) => (
              <div key={boost.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${boost.color}`}></div>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 italic uppercase tracking-tighter">Boost {boost.label}</h4>
                      <p className="text-xs font-bold text-slate-400">{boost.sub}</p>
                    </div>
                    <Rocket className={boost.color.replace('bg-', 'text-')} size={24} />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{boost.price} F</div>
                  <button
                    onClick={() => handlePurchase('BOOST', boost.id, boost.price)}
                    disabled={!!loading}
                    className="w-full py-3 rounded-xl bg-slate-50 text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                  >
                    Activer le Boost
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PremiumPage;
