import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { apiRequest } from '@shared/lib/api';
import { useAuth } from '../context/AuthContext';

type VerifyState = 'checking' | 'active' | 'pending' | 'error';

const PaymentReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, user, loading, reloadUser } = useAuth();
  const [state, setState] = useState<VerifyState>('checking');
  const [message, setMessage] = useState('Verification du paiement en cours...');
  const rawNextPath = searchParams.get('next') || '/profile';
  const nextPath = rawNextPath.startsWith('/') && !rawNextPath.startsWith('//') ? rawNextPath : '/profile';

  const reference = useMemo(
    () => searchParams.get('reference') || searchParams.get('trxref') || '',
    [searchParams]
  );

  useEffect(() => {
    if (loading) return;

    if (!reference) {
      setState('error');
      setMessage('Reference de paiement introuvable.');
      return;
    }

    if (!user) {
      setState('error');
      setMessage('Connectez-vous pour finaliser la verification du paiement.');
      return;
    }

    let cancelled = false;

    const verifyPayment = async () => {
      try {
        const res = await apiRequest<{ status: string }>(
          `/api/payments/verify?reference=${encodeURIComponent(reference)}`,
          { requireAuth: true }
        );

        if (cancelled) return;

        if (res.status === 'active') {
          await reloadUser();
          setState('active');
          setMessage(t('purchase_activated'));
          window.setTimeout(() => navigate(nextPath, { replace: true }), 1800);
          return;
        }

        setState('pending');
        setMessage(t('payment_pending'));
      } catch (error: any) {
        if (cancelled) return;
        setState('error');
        setMessage(error?.message || 'La verification du paiement a echoue.');
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [loading, navigate, nextPath, reference, reloadUser, t, user]);

  const Icon = state === 'active' ? CheckCircle2 : state === 'error' ? XCircle : Loader2;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-[2rem] p-8 text-center shadow-2xl space-y-6">
        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${
          state === 'active' ? 'bg-green-50 text-green-600' : state === 'error' ? 'bg-red-50 text-primary' : 'bg-amber-50 text-amber-600'
        }`}>
          <Icon size={34} className={state === 'checking' ? 'animate-spin' : ''} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
            {state === 'active' ? t('success') : state === 'error' ? t('error') : 'Paiement'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/store"
            className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest"
          >
            Retour aux abonnements
          </Link>
          <Link
            to="/profile"
            className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-widest"
          >
            Voir mon profil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
