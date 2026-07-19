import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Crown, Gem, Rocket, Star, CheckCircle2,
  Zap, ShieldCheck, EyeOff, MessageSquare,
  ChevronRight, ArrowRight, Sparkles, CreditCard, Lock, Award
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

const PremiumPage: React.FC = () => {
  const { profile, t } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (type: string, id: string, amount: number) => {
    setLoading(id);
    try {
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
    <div className="max-w-6xl mx-auto pb-24 px-4 space-y-16">
      {/* Hero Section - Ultra Luxury */}
      <div className="relative rounded-[4rem] overflow-hidden bg-slate-950 min-h-[500px] flex items-center shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] group">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200')] bg-cover bg-center opacity-30 mix-blend-overlay group-hover:scale-105 transition-transform duration-[10000ms]"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-transparent"></div>

          {/* Animated Glows */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 p-10 md:p-24 space-y-8 max-w-3xl">
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2.5 rounded-full shadow-2xl">
            <Crown size={20} className="text-amber-400" fill="currentColor" />
            <span className="text-white font-black uppercase tracking-[0.3em] text-[10px]">
              Le Cercle Galant
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter leading-[0.95]">
            L'Élégance n'a pas de <span className="text-primary not-italic">limites.</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-lg">
            Rejoignez l'élite, accédez à des privilèges exclusifs et multipliez vos rencontres d'exception par quatre.
          </p>

          <div className="flex items-center gap-8 pt-4">
             <div className="flex flex-col">
               <span className="text-2xl font-black text-white leading-none">100%</span>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Discrétion</span>
             </div>
             <div className="w-[1px] h-10 bg-white/10"></div>
             <div className="flex flex-col">
               <span className="text-2xl font-black text-white leading-none">VIP</span>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Traitement</span>
             </div>
             <div className="w-[1px] h-10 bg-white/10"></div>
             <div className="flex flex-col">
               <span className="text-2xl font-black text-white leading-none">∞</span>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Opportunités</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

        {/* SECTION 1: ABONNEMENTS - Design Apple-esque vs Luxury Dark */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-primary">
                <Gem size={24} />
              </div>
              Privilèges Adhésion
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Mensuel - Chic Minimaliste */}
            <div className="bg-white p-10 rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 group">
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Standard</h4>
                    <p className="text-primary font-black text-[10px] uppercase tracking-widest mt-1">Essentiel Galant</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                    <Star size={24} />
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-[1000] text-slate-900 tracking-tighter">5 000 F</span>
                  <span className="text-slate-400 font-black text-xs uppercase tracking-widest">/ mois</span>
                </div>

                <div className="h-[1px] bg-slate-100 w-full"></div>

                <ul className="space-y-4">
                  {[
                    'Swipes illimités & prioritaires',
                    'Badge Membre Certifié 💎',
                    'Découvrir qui vous a liké',
                    'Chat gratuit avec tous les Hôtes'
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-600 leading-tight">
                      <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handlePurchase('PLAN', 'MONTHLY', 5000)}
                disabled={!!loading}
                className="mt-12 w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-3"
              >
                {loading === 'MONTHLY' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'S\'ABONNER AU CERCLE'}
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Plan Trimestriel - The Masterpiece */}
            <div className="bg-slate-950 p-10 rounded-[3.5rem] shadow-[0_60px_120px_-20px_rgba(239,68,68,0.2)] border-4 border-primary/20 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6">
                <div className="bg-primary text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl animate-pulse">
                  Recommandé
                </div>
              </div>

              {/* Subtle background pattern/light */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px]"></div>

              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter text-white">Privilège</h4>
                    <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest mt-1">L'Expérience Ultime</p>
                  </div>
                  <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                    <Crown size={28} className="text-amber-400" fill="currentColor" />
                  </div>
                </div>

                <div className="space-y-1">
                   <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-[1000] text-white tracking-tighter">10 000 F</span>
                    <span className="text-slate-500 font-black text-xs uppercase tracking-widest">/ 3 mois</span>
                  </div>
                  <p className="text-primary font-black text-[9px] uppercase tracking-widest italic opacity-80">Soit 3 333 F / mois seulement</p>
                </div>

                <div className="h-[1px] bg-white/10 w-full"></div>

                <ul className="space-y-4">
                  {[
                    'Tous les avantages de Standard',
                    'Mode Invisible (Inconito total) 🎭',
                    '3 Roses d\'Or offertes chaque mois',
                    'Priorité absolue sur le support'
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-300 leading-tight">
                      <CheckCircle2 size={18} className="text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handlePurchase('PLAN', 'QUARTERLY', 10000)}
                disabled={!!loading}
                className="mt-12 w-full py-5 rounded-2xl bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_20px_40px_-5px_rgba(239,68,68,0.4)] hover:scale-[1.03] transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {loading === 'QUARTERLY' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'CHOISIR LE PRIVILÈGE'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: BOUTIQUE DE ROSES - Boutique de luxe style */}
        <div className="lg:col-span-4 space-y-10">
          <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
               <Award size={24} />
            </div>
            Boutique Roses
          </h3>

          <div className="bg-gradient-to-b from-amber-50 to-white rounded-[3.5rem] p-10 border border-amber-100/50 shadow-xl space-y-8 relative overflow-hidden">
            {/* Background Rose Pattern/Decoration */}
            <div className="absolute top-10 right-10 text-amber-200/20 rotate-12 -z-0">
               <Sparkles size={120} />
            </div>

            <div className="text-center space-y-3 relative z-10">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em] leading-none">Votre Solde Privé</p>
               <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl font-black text-slate-950 tracking-tighter">{profile?.roses_count || 0}</span>
                  <span className="text-2xl">🌹</span>
               </div>
            </div>

            <div className="space-y-4 relative z-10">
              {[
                { id: 'rose_1', label: '1 Rose d\'Or', sub: 'Unique Attention', price: 500, icon: '🌹' },
                { id: 'rose_5', label: 'Pack Découverte', sub: '5 Roses d\'Or', price: 2500, icon: '✨' },
                { id: 'rose_10', label: 'Pack Passion', sub: '10 Roses d\'Or', price: 5000, icon: '🔥' },
                { id: 'golden_rose', label: 'Golden Rose', sub: 'Prestige Absolu', price: 2500, icon: '🏆' },
              ].map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase('ROSE_PACK', pack.id, pack.price)}
                  disabled={!!loading}
                  className="w-full bg-white/60 backdrop-blur-md p-5 rounded-[1.8rem] flex items-center justify-between group hover:bg-white hover:shadow-2xl transition-all border border-amber-200/30 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                       {pack.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-950 leading-none">{pack.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">{pack.sub}</p>
                    </div>
                  </div>
                  <div className="bg-slate-950 text-white px-4 py-2 rounded-xl text-[10px] font-black group-hover:bg-amber-500 transition-colors">
                    {pack.price} F
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[9px] text-center text-slate-400 font-medium px-4 leading-relaxed italic">
              Les Roses d'Or vous permettent d'envoyer des notes parfumées et de briller instantanément auprès de vos coups de cœur.
            </p>
          </div>
        </div>

        {/* SECTION 3: BOOSTS - Modern Cards */}
        <div className="lg:col-span-12 space-y-10 pt-8">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <Rocket size={24} />
                </div>
                Accélérateurs de Destin
              </h3>
              <p className="text-slate-400 font-bold text-sm">Passez en tête de liste dans votre ville instantanément.</p>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { id: 'boost_1d', label: '1 Jour', price: 1000, color: 'bg-indigo-500', sub: 'Éclat Éphémère', icon: Zap },
              { id: 'boost_3d', label: '3 Jours', price: 2500, color: 'bg-purple-600', sub: 'Maître du Weekend', icon: Rocket },
              { id: 'boost_7d', label: '7 Jours', price: 5000, color: 'bg-slate-950', sub: 'Icône de la Semaine', icon: Crown },
            ].map((boost) => (
              <div key={boost.id} className="group bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50 relative overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className={`absolute top-0 left-0 w-full h-2 ${boost.color}`}></div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div className={`w-14 h-14 ${boost.id === 'boost_7d' ? 'bg-slate-100' : 'bg-purple-50'} rounded-2xl flex items-center justify-center text-purple-600 transition-transform group-hover:rotate-12`}>
                      <boost.icon size={32} className={boost.id === 'boost_7d' ? 'text-slate-900' : 'text-purple-600'} />
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Boost</p>
                       <h4 className="text-2xl font-[1000] text-slate-950 tracking-tighter">{boost.label}</h4>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-600 italic">"{boost.sub}"</p>
                    <div className="text-4xl font-black text-slate-950 tracking-tighter">{boost.price} F</div>
                  </div>

                  <button
                    onClick={() => handlePurchase('BOOST', boost.id, boost.price)}
                    disabled={!!loading}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                      boost.id === 'boost_7d'
                      ? 'bg-slate-950 text-white shadow-xl shadow-slate-200'
                      : 'bg-slate-50 text-slate-900 hover:bg-slate-950 hover:text-white'
                    }`}
                  >
                    {loading === boost.id ? 'TRAITEMENT...' : 'ACTIVER LE BOOST'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Trust - Footer of the page */}
        <div className="lg:col-span-12 pt-16 flex flex-col md:flex-row items-center justify-center gap-12 border-t border-slate-100">
           <div className="flex items-center gap-4 text-slate-400">
              <ShieldCheck size={32} className="text-green-500" />
              <div className="text-left leading-none">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-1">Sécurité</p>
                 <p className="text-xs font-bold text-slate-500">Paiements Chiffrés</p>
              </div>
           </div>
           <div className="flex items-center gap-4 text-slate-400">
              <CreditCard size={32} className="text-blue-500" />
              <div className="text-left leading-none">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-1">Partenaire</p>
                 <p className="text-xs font-bold text-slate-500">Paystack Verified</p>
              </div>
           </div>
           <div className="flex items-center gap-4 text-slate-400">
              <Lock size={32} className="text-amber-500" />
              <div className="text-left leading-none">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-1">Confiance</p>
                 <p className="text-xs font-bold text-slate-500">Garantie Galant</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default PremiumPage;
