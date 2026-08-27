import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, RefreshCw, Settings, ShieldCheck, TrendingUp, XCircle } from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

type WaveManualPayment = {
  id: string;
  reference_code: string;
  user_id: string;
  user_email?: string | null;
  type: string;
  plan_id?: string | null;
  target_id?: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUBMITTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  transaction_id?: string | null;
  payer_phone?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  created_at?: string;
  expires_at?: string;
  submitted_at?: string | null;
  admin_note?: string | null;
  profile?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    city?: string | null;
  } | null;
};

const statusClasses: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  SUBMITTED: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
  PROCESSING: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  EXPIRED: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch (_) {
    return value;
  }
};

const hasWaveProof = (payment: WaveManualPayment) => (
  !!payment.transaction_id?.trim() && !!payment.payer_phone?.trim()
);

const getOpenPaymentPriority = (payment: WaveManualPayment) => {
  const priorities: Record<string, number> = {
    SUBMITTED: 0,
    PROCESSING: 1,
    PENDING: 2
  };
  return priorities[payment.status] ?? 99;
};

const sortAdminPayments = (
  items: WaveManualPayment[],
  statusFilter: 'OPEN' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
) => [...items].sort((left, right) => {
  if (statusFilter === 'OPEN') {
    const priorityDelta = getOpenPaymentPriority(left) - getOpenPaymentPriority(right);
    if (priorityDelta !== 0) return priorityDelta;
  }

  return String(left.created_at || '').localeCompare(String(right.created_at || ''));
});

const AdminFinances: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<WaveManualPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('OPEN');

  const openCount = useMemo(
    () => payments.filter(payment => payment.status === 'PENDING' || payment.status === 'SUBMITTED' || payment.status === 'PROCESSING').length,
    [payments]
  );

  const readyPayments = useMemo(
    () => sortAdminPayments(payments.filter(hasWaveProof), statusFilter),
    [payments, statusFilter]
  );

  const incompletePayments = useMemo(
    () => sortAdminPayments(payments.filter(payment => !hasWaveProof(payment)), statusFilter),
    [payments, statusFilter]
  );

  const loadPayments = async () => {
    setLoading(true);
    try {
      const payload = await apiRequest<{ payments: WaveManualPayment[] }>(
        `/api/admin/payments/wave?status=${encodeURIComponent(statusFilter)}`,
        { requireAuth: true }
      );
      setPayments(payload.payments || []);
    } catch (error: any) {
      showAlert('Erreur', error.message || 'Impossible de charger les paiements Wave.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayments();
  }, [statusFilter]);

  const resolvePayment = async (payment: WaveManualPayment, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'valider' : 'rejeter';
    const adminNote = window.prompt(`Note admin pour ${actionLabel} ${payment.reference_code} ?`, '') || '';
    setActionId(`${action}_${payment.reference_code}`);
    try {
      await apiRequest(`/api/admin/payments/wave/${encodeURIComponent(payment.reference_code)}/${action}`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ adminNote })
      });
      showAlert('Succes', action === 'approve' ? 'Paiement Wave valide et service debloque.' : 'Paiement Wave rejete.');
      await loadPayments();
    } catch (error: any) {
      showAlert('Erreur', error.message || `Impossible de ${actionLabel} ce paiement.`);
    } finally {
      setActionId(null);
    }
  };

  const renderPaymentCard = (payment: WaveManualPayment) => {
    const isReady = hasWaveProof(payment);

    return (
      <article key={payment.reference_code} className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-black text-primary">{payment.reference_code}</span>
              <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${statusClasses[payment.status] || statusClasses.PENDING}`}>
                {payment.status}
              </span>
              {isReady ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Dossier complet
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  Infos manquantes
                </span>
              )}
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {payment.amount} F CFA - {payment.type}{payment.plan_id ? ` / ${payment.plan_id}` : ''}
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Client: {payment.profile?.name || payment.user_email || payment.user_id}
              {payment.profile?.city ? ` - ${payment.profile.city}` : ''}
            </p>
            <div className="grid gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:grid-cols-2">
              <span>ID Wave: {payment.transaction_id || 'non renseigne'}</span>
              <span>Numero: {payment.payer_phone || '-'}</span>
              <span>Cree: {formatDate(payment.created_at)}</span>
              <span>Expire: {formatDate(payment.expires_at)}</span>
            </div>
          </div>

          <div className="flex gap-2 lg:flex-col">
            <button
              onClick={() => void resolvePayment(payment, 'approve')}
              disabled={!!actionId || payment.status === 'APPROVED' || !isReady}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40 lg:flex-none"
            >
              {actionId === `approve_${payment.reference_code}` ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
              Valider
            </button>
            <button
              onClick={() => void resolvePayment(payment, 'reject')}
              disabled={!!actionId || payment.status === 'APPROVED' || payment.status === 'REJECTED'}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 disabled:opacity-40 dark:bg-red-500/10 dark:text-red-300 lg:flex-none"
            >
              {actionId === `reject_${payment.reference_code}` ? <Loader2 className="animate-spin" size={15} /> : <XCircle size={15} />}
              Rejeter
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderPaymentSection = (title: string, subtitle: string, items: WaveManualPayment[]) => (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{title}</h4>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            {items.length}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-400 dark:border-white/10">
          Aucun paiement dans cette section.
        </div>
      ) : (
        items.map(renderPaymentCard)
      )}
    </div>
  );

  return (
    <div className="space-y-6 lg:space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Finances
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 sm:text-lg">
            Validation des paiements Wave et acces aux outils financiers.
          </p>
        </div>
        <button
          onClick={() => void loadPayments()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-[2rem] border border-slate-50 bg-white p-6 shadow-xl transition-colors dark:border-white/5 dark:bg-slate-900 dark:shadow-none lg:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 transition-colors dark:bg-green-900/20 dark:text-green-400">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Revenus</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Les revenus automatiques restent traites par les prestataires de paiement. Les paiements Wave ci-dessous demandent une validation admin.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-50 bg-white p-6 shadow-xl transition-colors dark:border-white/5 dark:bg-slate-900 dark:shadow-none lg:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors dark:bg-amber-900/20 dark:text-amber-400">
            <CreditCard size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Tarification</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Les prix des roses, interactions et abonnements sont geres par la page Tarifs, branchee sur Firestore.
          </p>
          <button
            onClick={() => navigate('/admin/pricing')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-all dark:bg-white dark:text-slate-900 sm:w-auto"
          >
            <Settings size={16} />
            Ouvrir les tarifs
          </button>
        </section>

        <section className="rounded-[2rem] border border-cyan-100 bg-cyan-50 p-6 shadow-xl transition-colors dark:border-cyan-400/10 dark:bg-cyan-500/10 dark:shadow-none lg:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-cyan-600 transition-colors dark:bg-white/10 dark:text-cyan-300">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Wave</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            {openCount} paiement{openCount > 1 ? 's' : ''} a verifier. Validez uniquement apres controle dans Wave.
          </p>
        </section>
      </div>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-xl dark:border-white/5 dark:bg-slate-900 lg:p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Paiements Wave a verifier</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Les paiements complets sont separes des dossiers incomplets. Les plus anciens sont toujours en haut.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="OPEN">Ouverts</option>
            <option value="SUBMITTED">Soumis</option>
            <option value="PENDING">En attente ID</option>
            <option value="APPROVED">Valides</option>
            <option value="REJECTED">Rejetes</option>
            <option value="ALL">Tous</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400 dark:border-white/10">
            Aucun paiement Wave pour ce filtre.
          </div>
        ) : (
          <div className="space-y-6">
            {renderPaymentSection(
              'Paiements prets a verifier',
              'ID transaction Wave et numero Wave sont renseignes. A traiter en priorite.',
              readyPayments
            )}
            {renderPaymentSection(
              'Paiements incomplets',
              'ID transaction ou numero Wave manquant. Ils restent visibles mais ne peuvent pas etre valides.',
              incompletePayments
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminFinances;
