import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  userName: string;
}

const REPORT_REASONS = [
  { id: 'FAKE_PROFILE', label: { fr: 'Faux profil / Impersonnalisation', en: 'Fake profile / Impersonation' } },
  { id: 'HARASSMENT', label: { fr: 'Harcèlement / Comportement offensant', en: 'Harassment / Offensive behavior' } },
  { id: 'INAPPROPRIATE_CONTENT', label: { fr: 'Contenu inapproprié', en: 'Inappropriate content' } },
  { id: 'SCAM', label: { fr: 'Arnaque / Fraude', en: 'Scam / Fraud' } },
  { id: 'OTHER', label: { fr: 'Autre motif', en: 'Other reason' } },
];

const copy = {
  fr: {
    title: 'Signaler un membre',
    subtitle: (name: string) => `Aidez-nous à protéger la communauté Galant en signalant tout comportement inapproprié de ${name}.`,
    reasonLabel: 'Motif du signalement',
    detailsLabel: 'Précisions (optionnel)',
    detailsPlaceholder: 'Détaillez les faits pour nous aider à agir...',
    submit: 'Envoyer le signalement',
    successTitle: 'Signalement transmis',
    successBody: 'Merci de contribuer à la sécurité de Galant. Notre équipe de modération va traiter votre demande sous peu.',
    errorTitle: 'Erreur',
    errorBody: 'Échec de l\'envoi du signalement.',
    close: 'Fermer'
  },
  en: {
    title: 'Report a member',
    subtitle: (name: string) => `Help us protect the Galant community by reporting any inappropriate behavior from ${name}.`,
    reasonLabel: 'Reason for reporting',
    detailsLabel: 'Additional details (optional)',
    detailsPlaceholder: 'Describe the facts to help us take action...',
    submit: 'Send report',
    successTitle: 'Report sent',
    successBody: 'Thank you for contributing to Galant\'s safety. Our moderation team will review your request shortly.',
    errorTitle: 'Error',
    errorBody: 'Failed to send the report.',
    close: 'Close'
  }
};

const ReportModal: React.FC<Props> = ({ isOpen, onClose, reportedUserId, userName }) => {
  const { language } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>('FAKE_PROFILE');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const c = copy[language] || copy.fr;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await apiRequest('/api/messages/report', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          reportedUserId,
          reason: selectedReason,
          details: details.trim() || undefined
        })
      });
      setSubmitted(true);
    } catch (error: any) {
      showAlert(c.errorTitle, error.message || c.errorBody);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10">
          <div className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-[2rem] flex items-center justify-center mx-auto text-green-500 shadow-xl shadow-green-100 dark:shadow-none">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black  text-slate-900 dark:text-white">{c.successTitle}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                {c.successBody}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              {c.close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 text-red-500">
             <ShieldAlert size={24} />
             <h3 className="text-2xl font-black  text-slate-900 dark:text-white leading-none">{c.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300" aria-label={c.close}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/20 flex gap-4">
             <AlertTriangle className="text-red-500 shrink-0" size={20} />
             <p className="text-xs font-medium text-red-700 dark:text-red-400 leading-relaxed">
               {c.subtitle(userName)}
             </p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{c.reasonLabel}</label>
            <div className="grid grid-cols-1 gap-2">
               {REPORT_REASONS.map((reason) => (
                 <button
                   key={reason.id}
                   type="button"
                   onClick={() => setSelectedReason(reason.id)}
                   className={`p-4 rounded-xl border-2 text-left transition-all text-sm font-bold ${
                     selectedReason === reason.id
                       ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-red-500/5'
                       : 'border-slate-50 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-white/10'
                   }`}
                 >
                   {reason.label[language] || reason.label.fr}
                 </button>
               ))}
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{c.detailsLabel}</label>
             <textarea
               value={details}
               onChange={(e) => setDetails(e.target.value)}
               placeholder={c.detailsPlaceholder}
               rows={4}
               className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 outline-none focus:ring-2 focus:ring-primary/10 font-medium text-slate-700 dark:text-slate-200 resize-none transition-colors"
             />
          </div>
        </form>

        <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
            {c.submit}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
