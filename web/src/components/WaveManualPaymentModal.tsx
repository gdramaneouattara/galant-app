import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, Loader2, ShieldCheck, Waves, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { WaveManualIntent } from '@shared/hooks/useSubscription';

type Props = {
  isOpen: boolean;
  intent: WaveManualIntent | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { transactionId: string; phone: string }) => Promise<void> | void;
};

const copy = {
  fr: {
    title: 'Paiement Wave',
    body: 'Payez le montant exact avec le lien Wave, puis renseignez l ID transaction affiche dans Wave.',
    amount: 'Montant exact',
    reference: 'Reference Galant',
    receiver: 'Compte beneficiaire',
    openWave: 'Ouvrir Wave',
    transactionId: 'ID transaction Wave',
    phone: 'Numero Wave utilise',
    submit: 'Soumettre a validation',
    pending: 'Validation admin requise',
    warning: 'Le service reste bloque jusqu a verification dans Wave.',
    copied: 'Copie'
  },
  en: {
    title: 'Wave payment',
    body: 'Pay the exact amount with the Wave link, then enter the transaction ID shown in Wave.',
    amount: 'Exact amount',
    reference: 'Galant reference',
    receiver: 'Receiver account',
    openWave: 'Open Wave',
    transactionId: 'Wave transaction ID',
    phone: 'Wave phone used',
    submit: 'Submit for validation',
    pending: 'Admin validation required',
    warning: 'The service stays locked until verification in Wave.',
    copied: 'Copied'
  }
};

const WaveManualPaymentModal: React.FC<Props> = ({ isOpen, intent, loading, onClose, onSubmit }) => {
  const { language } = useAuth();
  const c = copy[language] || copy.fr;
  const [transactionId, setTransactionId] = useState('');
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !intent) return null;

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch (_) {}
  };

  const modal = (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/80 px-4 py-3 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10">
              <Waves size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{c.title}</h3>
              <p className="text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{c.body}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.amount}</p>
              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{intent.amount} F</p>
            </div>
            <button
              type="button"
              onClick={() => copyValue(c.reference, intent.reference_code)}
              className="rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.reference}</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-black text-primary">
                {intent.reference_code}
                <Copy size={14} />
              </p>
            </button>
          </div>

          {(intent.receiver_name || intent.receiver_phone) && (
            <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.receiver}</p>
              <p className="mt-1 text-sm font-black text-slate-800 dark:text-white">
                {[intent.receiver_name, intent.receiver_phone].filter(Boolean).join(' - ')}
              </p>
            </div>
          )}

          <a
            href={intent.payment_link}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#09a5db] px-5 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-cyan-500/20 transition active:scale-95"
          >
            <ExternalLink size={18} />
            {c.openWave}
          </a>

          <div className="space-y-3">
            <input
              value={transactionId}
              onChange={(event) => setTransactionId(event.target.value)}
              placeholder={c.transactionId}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-bold outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={c.phone}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-bold outline-none focus:border-cyan-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <button
            type="button"
            disabled={loading || !transactionId.trim() || !phone.trim()}
            onClick={() => onSubmit({ transactionId: transactionId.trim(), phone: phone.trim() })}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            {c.submit}
          </button>

          <p className="text-center text-[10px] font-black uppercase tracking-widest text-amber-500">
            {copied ? `${c.copied}: ${copied}` : c.pending}
          </p>
          <p className="text-center text-[10px] font-semibold leading-relaxed text-slate-400">{c.warning}</p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default WaveManualPaymentModal;
