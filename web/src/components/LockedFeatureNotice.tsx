import React from 'react';
import { ChevronLeft, LockKeyhole, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type LockedFeatureNoticeProps = {
  title: string;
  backTo?: string;
  onBack?: () => void;
};

const LockedFeatureNotice: React.FC<LockedFeatureNoticeProps> = ({ title, backTo = '/apps', onBack }) => {
  const navigate = useNavigate();
  const { language } = useAuth();
  const copy = language === 'en'
    ? {
        badge: 'Coming soon',
        headline: `${title} is being finalized`,
        body: 'This feature is temporarily locked while we finish the experience.',
        back: 'Back',
        note: 'Galant is preparing a cleaner and more reliable version.'
      }
    : {
        badge: 'Bientot disponible',
        headline: `${title} est en finalisation`,
        body: 'Cette fonctionnalite est temporairement verrouillee le temps de finaliser l experience.',
        back: 'Retour',
        note: 'Galant prepare une version plus propre et plus fiable.'
      };

  return (
    <div className="mx-auto flex min-h-[62vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-xl shadow-red-500/10">
        <LockKeyhole size={34} />
      </div>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
        <Sparkles size={13} />
        {copy.badge}
      </div>
      <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {copy.headline}
      </h2>
      <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
        {copy.body}
      </p>
      <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-slate-400 dark:text-slate-500">
        {copy.note}
      </p>
      <button
        type="button"
        onClick={() => {
          if (onBack) {
            onBack();
            return;
          }
          navigate(backTo);
        }}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition active:scale-95 dark:bg-white dark:text-slate-900"
      >
        <ChevronLeft size={16} />
        {copy.back}
      </button>
    </div>
  );
};

export default LockedFeatureNotice;
