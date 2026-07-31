import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Gem,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Users,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

interface AdminStats {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    suspended: number;
    admins: number;
    verified: number;
    premium: number;
    male: number;
    female: number;
  };
  premiumByPlan: Record<string, number>;
  kyc: {
    totalRequests: number;
    pending: number;
  };
  moderation: {
    reportsTotal: number;
    reportsOpen: number;
  };
}

const formatNumber = (value?: number) => new Intl.NumberFormat('fr-FR').format(value || 0);

const percent = (value: number, total: number) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<AdminStats>('/api/admin/stats', { requireAuth: true });
      setStats(data);
    } catch (e: any) {
      showAlert('Erreur', e.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = useMemo(() => {
    const users = stats?.users;
    const kyc = stats?.kyc;
    const moderation = stats?.moderation;

    return [
      {
        label: 'Utilisateurs',
        value: formatNumber(users?.total),
        detail: `${formatNumber(users?.active)} actifs`,
        icon: Users,
        color: 'text-blue-500',
        bg: 'bg-blue-50'
      },
      {
        label: 'Premium',
        value: formatNumber(users?.premium),
        detail: `${percent(users?.premium || 0, users?.total || 0)}% des membres`,
        icon: Gem,
        color: 'text-amber-500',
        bg: 'bg-amber-50'
      },
      {
        label: 'KYC en attente',
        value: formatNumber(kyc?.pending),
        detail: `${formatNumber(kyc?.totalRequests)} dossiers`,
        icon: ShieldCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50'
      },
      {
        label: 'Alertes ouvertes',
        value: formatNumber(moderation?.reportsOpen),
        detail: `${formatNumber(moderation?.reportsTotal)} signalements`,
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-50'
      }
    ];
  }, [stats]);

  const handleReconcileCounters = async () => {
    if (!window.confirm('Cette action va recompter tous les likes et toutes les roses. Continuer ?')) return;

    setReconciling(true);
    try {
      const res = await apiRequest<any>('/api/admin/users/reconcile-counters', {
        method: 'POST',
        requireAuth: true
      });
      showAlert('Succes', `Reconciliation terminee. ${res.updated} profils mis a jour.`);
      fetchStats();
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setReconciling(false);
    }
  };

  const handleBackfillGeohashes = async () => {
    if (!window.confirm('Cette action va remplir le geohash des profils existants avec coordonnees. Continuer ?')) return;

    setBackfilling(true);
    try {
      const res = await apiRequest<any>('/api/admin/users/backfill-geohashes', {
        method: 'POST',
        requireAuth: true
      });
      showAlert('Succes', `Backfill termine. ${res.updated} profils mis a jour sur ${res.processed} traites.`);
    } catch (e: any) {
      showAlert('Erreur', e.message);
    } finally {
      setBackfilling(false);
    }
  };

  const malePct = percent(stats?.users.male || 0, stats?.users.total || 0);
  const femalePct = percent(stats?.users.female || 0, stats?.users.total || 0);
  const malePremiumPct = percent(stats?.users.premium || 0, stats?.users.male || 0);
  const verifiedPct = percent(stats?.users.verified || 0, stats?.users.total || 0);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RefreshCw className="animate-spin text-slate-300" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Vue d'ensemble</h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">Pilotage reel de la communaute Galant.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((stat) => (
          <div key={stat.label} className="rounded-[2rem] border border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} dark:bg-opacity-10 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <span className="block text-3xl font-black tracking-tighter text-slate-900 dark:text-white">{stat.value}</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{stat.label}</span>
            <span className="mt-3 block text-xs font-bold text-slate-500 dark:text-slate-400">{stat.detail}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] bg-slate-900 dark:bg-slate-950 p-6 text-white shadow-2xl lg:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-3 text-lg font-black italic sm:text-xl">
              <PieChart className="text-primary" />
              Repartition par sexe
            </h3>
            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Firestore</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Hommes</span>
                <span>{formatNumber(stats?.users.male)} ({malePct}%)</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${malePct}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Femmes</span>
                <span>{formatNumber(stats?.users.female)} ({femalePct}%)</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${femalePct}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <p className="text-[10px] font-black uppercase text-slate-500">Profils certifies</p>
              <p className="text-xl font-black text-blue-400">{verifiedPct}%</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <p className="text-[10px] font-black uppercase text-slate-500">Ratio premium</p>
              <p className="text-xl font-black text-amber-400">{malePremiumPct}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 p-6 shadow-xl lg:p-10 dark:shadow-none">
          <h3 className="mb-6 text-xl font-black italic text-slate-900 dark:text-white">Maintenance & outils</h3>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={handleReconcileCounters}
              disabled={reconciling}
              className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900 dark:bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-white dark:text-slate-900 transition-all disabled:opacity-50"
            >
              {reconciling ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              Reconciler likes/roses
            </button>

            <button
              onClick={handleBackfillGeohashes}
              disabled={backfilling}
              className="flex items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50"
            >
              {backfilling ? <RefreshCw className="animate-spin" size={16} /> : <UserCheck size={16} />}
              Backfill geohash
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 dark:bg-slate-800 p-5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Les donnees de chiffre d'affaires ne sont pas encore exposees par l'API admin. Le dashboard n'affiche donc plus de faux CA.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
