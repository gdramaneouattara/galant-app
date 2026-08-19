import React, { useEffect, useState } from 'react';
import { X, CheckCircle, ShieldCheck, Gem, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showAlert } from '@shared/lib/ui-bridge';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onApply: (f: any) => void;
  defaultFilters: any;
  is_premium: boolean;
}

const copy = {
  fr: {
    premiumTitle: 'Privilège Premium',
    standingLocked: 'Les filtres de standing sont reserves aux membres Premium.',
    scoreLocked: 'Le filtrage par score de galanterie est une option Premium.',
    title: 'Filtres de recherche',
    see: 'Je veux voir',
    men: 'Hommes',
    women: 'Femmes',
    all: 'Tous',
    age: 'Age',
    to: 'a',
    standing: 'Criteres de standing',
    premiumOnly: 'Membres Premium uniquement',
    premiumOnlySub: 'Badge obligatoire',
    verifiedOnly: 'Profils certifies uniquement',
    verifiedOnlySub: "L'elite verifiee par Galant",
    minScore: 'Score minimum',
    apply: 'Appliquer les filtres',
    reset: 'Reinitialiser',
    back: 'Retour',
    close: 'Fermer'
  },
  en: {
    premiumTitle: 'Premium privilege',
    standingLocked: 'Standing filters are reserved for Premium members.',
    scoreLocked: 'Galantry score filtering is a Premium option.',
    title: 'Search filters',
    see: 'I want to see',
    men: 'Men',
    women: 'Women',
    all: 'All',
    age: 'Age',
    to: 'to',
    city: 'City',
    standing: 'Standing criteria',
    premiumOnly: 'Premium members only',
    premiumOnlySub: 'Badge required',
    verifiedOnly: 'Certified profiles only',
    verifiedOnlySub: 'The elite verified by Galant',
    minScore: 'Minimum score',
    apply: 'Apply filters',
    reset: 'Reset',
    back: 'Back',
    close: 'Close'
  }
};

const FilterModal: React.FC<Props> = ({ isOpen, onClose, filters, onApply, defaultFilters, is_premium }) => {
  const navigate = useNavigate();
  const { language } = useAuth();
  const c = copy[language] || copy.fr;
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    if (isOpen) {
      setDraftFilters(filters);
    }
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handlePremiumFilter = (key: string) => {
    if (!is_premium) {
      showAlert(c.premiumTitle, c.standingLocked);
      onClose();
      navigate('/premium');
      return;
    }
    setDraftFilters({ ...draftFilters, [key]: !draftFilters[key] });
  };

  const handleScoreFilter = (score: number) => {
    if (score > 0 && !is_premium) {
      showAlert(c.premiumTitle, c.scoreLocked);
      onClose();
      navigate('/premium');
      return;
    }
    setDraftFilters({ ...draftFilters, minScore: score });
  };

  const handleApply = () => {
    onApply({ ...draftFilters });
    onClose();
  };

  const handleReset = () => {
    const nextFilters = { ...defaultFilters };
    setDraftFilters(nextFilters);
    onApply(nextFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header - Fixed at top */}
        <div className="p-6 border-b border-slate-50 grid grid-cols-[auto_1fr_auto] items-center gap-4 flex-shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400" aria-label={c.back}>
            <ChevronLeft size={24} />
          </button>
          <h3 className="min-w-0 truncate text-xl font-black ">{c.title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300" aria-label={c.close}>
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable area */}
        <div className="p-6 space-y-8 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{c.see}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'MALE', label: c.men },
                { id: 'FEMALE', label: c.women },
                { id: 'ALL', label: c.all }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setDraftFilters({ ...draftFilters, gender: g.id })}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all border ${
                    draftFilters.gender === g.id ? 'bg-primary text-white border-primary shadow-lg shadow-red-100' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{c.age} : {draftFilters.minAge} - {draftFilters.maxAge}</p>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={draftFilters.minAge}
                onChange={e => setDraftFilters({ ...draftFilters, minAge: parseInt(e.target.value, 10) || defaultFilters.minAge })}
                className="w-full bg-slate-50 border-none p-4 rounded-2xl text-center font-bold"
              />
              <span className="font-black text-slate-200">{c.to}</span>
              <input
                type="number"
                value={draftFilters.maxAge}
                onChange={e => setDraftFilters({ ...draftFilters, maxAge: parseInt(e.target.value, 10) || defaultFilters.maxAge })}
                className="w-full bg-slate-50 border-none p-4 rounded-2xl text-center font-bold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">{c.city}</p>
            <input
              type="text"
              value={draftFilters.city || ''}
              onChange={e => setDraftFilters({ ...draftFilters, city: e.target.value })}
              placeholder="Ex: Douala, Abidjan..."
              className="w-full bg-slate-50 border-none p-4 rounded-2xl font-bold text-slate-900"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-50">
            <p className="text-xs font-black uppercase text-primary tracking-widest">{c.standing}</p>

            <button
              onClick={() => handlePremiumFilter('premiumOnly')}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between text-left ${
                draftFilters.premiumOnly ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${draftFilters.premiumOnly ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <Gem size={20} />
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900 leading-none">{c.premiumOnly}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{c.premiumOnlySub}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${draftFilters.premiumOnly ? 'bg-primary border-primary' : 'border-slate-200'}`}>
                {draftFilters.premiumOnly && <CheckCircle size={14} className="text-white" />}
              </div>
            </button>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-[auto_1fr] gap-3 flex-shrink-0">
          <button
            onClick={handleReset}
            className="px-5 bg-white text-slate-500 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
          >
            {c.reset}
          </button>
          <button
            onClick={handleApply}
            className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            {c.apply}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
