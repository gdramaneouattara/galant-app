import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Settings, TrendingUp } from 'lucide-react';

const AdminFinances: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 lg:space-y-10">
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Finances
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">
          Les donnees de revenus ne sont pas encore exposees par l'API admin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-xl dark:shadow-none lg:p-8 transition-colors">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Revenus</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Aucun endpoint backend ne calcule encore le chiffre d'affaires, les ventes de roses ou les revenus partenaires.
            Cette page n'affiche plus de donnees fictives.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-xl dark:shadow-none lg:p-8 transition-colors">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 transition-colors">
            <CreditCard size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Tarification</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Les prix des roses, interactions et abonnements sont geres par la page Tarifs, branchee sur Firestore.
          </p>
          <button
            onClick={() => navigate('/admin/pricing')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-slate-900 sm:w-auto transition-all"
          >
            <Settings size={16} />
            Ouvrir les tarifs
          </button>
        </section>
      </div>
    </div>
  );
};

export default AdminFinances;
