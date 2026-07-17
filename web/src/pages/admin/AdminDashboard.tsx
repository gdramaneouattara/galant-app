import React from 'react';
import { Users, Gem, Calendar, CreditCard, TrendingUp, TrendingDown, Info, PieChart } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Utilisateurs Totaux', value: '2,840', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', trend: '+12%', trendUp: true },
    { label: 'Membres Premium', value: '412', icon: Gem, color: 'text-amber-500', bg: 'bg-amber-50', trend: '+5%', trendUp: true },
    { label: 'Événements Actifs', value: '28', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50', trend: '-2%', trendUp: false },
    { label: 'Chiffre d\'Affaires', value: '1.2M F', icon: CreditCard, color: 'text-green-500', bg: 'bg-green-50', trend: '+18%', trendUp: true },
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Vue d'ensemble</h2>
          <p className="text-slate-500 font-medium mt-1 text-lg">Pilotage de la communauté Galant.</p>
        </div>
        <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 uppercase tracking-widest">
          Temps Réel
        </div>
      </div>

      {/* Cartes Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 space-y-4">
            <div className="flex justify-between items-start">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                <stat.icon size={28} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-3 py-1 rounded-lg ${stat.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {stat.trend}
              </div>
            </div>
            <div>
              <span className="block text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION DÉSAGRÉGATION PAR SEXE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black italic flex items-center gap-3">
              <PieChart className="text-primary" />
              Répartition par Sexe
            </h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">Détails Démographiques</span>
          </div>

          <div className="space-y-6">
            {/* Hommes */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> HOMMES</span>
                <span>1,647 (58%)</span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '58%' }}></div>
              </div>
            </div>

            {/* Femmes */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full"></div> FEMMES</span>
                <span>1,193 (42%)</span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
          </div>

          <div className="pt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase">Conversion Hommes</p>
              <p className="text-xl font-black text-blue-400">12.5% Premium</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase">Conversion Femmes</p>
              <p className="text-xl font-black text-rose-400">8.2% Premium</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-50">
          <h3 className="text-xl font-black mb-6 italic">Activité des Partenaires</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-black italic">G</div>
                 <div>
                    <p className="font-bold text-slate-900 text-sm">Nouveau Partenaire : Sky Lounge</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Douala • Il y a 2h</p>
                 </div>
               </div>
               <button className="text-[10px] font-black text-primary border border-primary/20 px-3 py-1 rounded-lg">VOIR</button>
            </div>
            {/* Autres news... */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
