import React, { useState } from 'react';
import {
  CreditCard,
  TrendingUp,
  Gem,
  Package,
  Rocket,
  MessageSquare,
  Save,
  Info,
  DollarSign
} from 'lucide-react';
import { showAlert } from '@shared/lib/ui-bridge';

const AdminFinances: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Valeurs synchronisées avec le fichier .env.local
  const [pricing, setPricing] = useState({
    rose_pack_1: 500,        // 1 Rose (Super Like / Rose Note / Chat)
    rose_pack_5: 2500,       // Pack intermédiaire
    rose_pack_10: 5000,      // Équivalent d'un mois premium
    boost_1d: 1000,
    boost_3d: 2500,
    boost_7d: 5000,
    plan_monthly: 5000,
    plan_quarterly: 10000,
    golden_rose: 2500,
    partner_event_boost: 25000,
    partner_monthly_prestige: 50000
  });

  const handleUpdatePrice = (key: string, value: string) => {
    setPricing(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const savePricing = async () => {
    setLoading(true);
    try {
      // Simuler appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showAlert('Tarification mise à jour', 'Les nouveaux prix seront appliqués immédiatement sur Web et Mobile.');
    } catch (e) {
      showAlert('Erreur', 'Impossible de sauvegarder la tarification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             Finances & Tarification
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-lg">Gérez vos flux de revenus et vos tarifs.</p>
        </div>
        <button
          onClick={savePricing}
          disabled={loading}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />}
          Sauvegarder les modifications
        </button>
      </div>

      {/* Résumé Financier (Statique pour l'instant) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenus du mois</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">1,250,000 F</span>
            <span className="text-green-500 font-bold text-xs mb-1">+18%</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventes de Roses</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">450,000 F</span>
            <span className="text-slate-400 font-medium text-xs mb-1">320 packs</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abonnements Business</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900 tracking-tighter">280,000 F</span>
            <span className="text-slate-400 font-medium text-xs mb-1">14 partenaires</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PACKS DE ROSES & ABONNEMENTS */}
        <section className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
               <Gem size={20} />
             </div>
             <h3 className="text-xl font-black italic">Roses & Abonnements 🌹</h3>
          </div>
          <div className="p-8 space-y-6">
            {[
              { label: '1 Rose (Super Like / Note / Chat)', key: 'rose_pack_1' },
              { label: 'Abonnement Mensuel (Standard)', key: 'plan_monthly' },
              { label: 'Abonnement Trimestriel (Privilège)', key: 'plan_quarterly' },
              { label: 'Golden Rose (Cadeau Spécial)', key: 'golden_rose' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between group">
                <span className="text-sm font-bold text-slate-600">{item.label}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={(pricing as any)[item.key]}
                    onChange={(e) => handleUpdatePrice(item.key, e.target.value)}
                    className="w-28 bg-slate-50 border-none px-4 py-2 rounded-xl text-right font-black text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase">FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOOSTS DE VISIBILITÉ */}
        <section className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center gap-3">
             <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
               <Rocket size={20} />
             </div>
             <h3 className="text-xl font-black italic">Boosts de Visibilité 🚀</h3>
          </div>
          <div className="p-8 space-y-6">
            {[
              { label: 'Boost 1 Jour', key: 'boost_1d' },
              { label: 'Boost 3 Jours', key: 'boost_3d' },
              { label: 'Boost 7 Jours', key: 'boost_7d' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">{item.label}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={(pricing as any)[item.key]}
                    onChange={(e) => handleUpdatePrice(item.key, e.target.value)}
                    className="w-28 bg-slate-50 border-none px-4 py-2 rounded-xl text-right font-black text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase">FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES BUSINESS */}
        <section className="bg-white rounded-[3rem] shadow-2xl border border-slate-50 overflow-hidden lg:col-span-2">
          <div className="p-8 border-b border-slate-50 flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
               <Package size={20} />
             </div>
             <h3 className="text-xl font-black italic">Tarifs Business (Partenaires) 🏢</h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {[
              { label: 'Mise en avant Événement (Agenda)', key: 'partner_event_boost' },
              { label: 'Abonnement Mensuel Prestige (Guide)', key: 'partner_monthly_prestige' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">{item.label}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={(pricing as any)[item.key]}
                    onChange={(e) => handleUpdatePrice(item.key, e.target.value)}
                    className="w-32 bg-slate-50 border-none px-4 py-2 rounded-xl text-right font-black text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase">FCFA</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
             <Info className="text-slate-400 shrink-0" size={18} />
             <p className="text-xs font-medium text-slate-500 italic">
               Note: Ces tarifs s'appliquent uniquement aux transactions directes sur le Web (Mobile Money / CB). Pour l'application mobile native, les prix sont fixés dans les consoles Apple et Google et peuvent varier légèrement selon le taux de change.
             </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminFinances;
