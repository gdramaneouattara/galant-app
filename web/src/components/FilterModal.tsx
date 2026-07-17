import React from 'react';
import { X, CheckCircle, ShieldCheck, Gem } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showAlert } from '@shared/lib/ui-bridge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  setFilters: (f: any) => void;
  isPremium: boolean;
}

const FilterModal: React.FC<Props> = ({ isOpen, onClose, filters, setFilters, isPremium }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handlePremiumFilter = (key: string) => {
    if (!isPremium) {
      showAlert('Privilège Premium 💎', 'Les filtres de standing sont réservés aux membres Premium.');
      onClose();
      navigate('/premium');
      return;
    }
    setFilters({ ...filters, [key]: !filters[key] });
  };

  const handleScoreFilter = (score: number) => {
    if (score > 0 && !isPremium) {
      showAlert('Privilège Premium 💎', 'Le filtrage par score de galanterie est une option Premium.');
      onClose();
      navigate('/premium');
      return;
    }
    setFilters({ ...filters, minScore: score });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-2xl font-black italic">Filtres de recherche</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Genre */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Je veux voir</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'MALE', label: 'Hommes' },
                { id: 'FEMALE', label: 'Femmes' },
                { id: 'ALL', label: 'Tous' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setFilters({ ...filters, gender: g.id })}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all border ${
                    filters.gender === g.id ? 'bg-primary text-white border-primary shadow-lg shadow-red-100' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Âge */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Âge : {filters.minAge} - {filters.maxAge} ans</p>
            <div className="flex items-center gap-4">
               <input
                 type="number"
                 value={filters.minAge}
                 onChange={e => setFilters({...filters, minAge: parseInt(e.target.value)})}
                 className="w-full bg-slate-50 border-none p-4 rounded-2xl text-center font-bold"
               />
               <span className="font-black text-slate-200">à</span>
               <input
                 type="number"
                 value={filters.maxAge}
                 onChange={e => setFilters({...filters, maxAge: parseInt(e.target.value)})}
                 className="w-full bg-slate-50 border-none p-4 rounded-2xl text-center font-bold"
               />
            </div>
          </div>

          {/* Standing Premium */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <p className="text-xs font-black uppercase text-primary tracking-widest">Critères de standing 💎</p>

            <button
              onClick={() => handlePremiumFilter('premiumOnly')}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between text-left ${
                filters.premiumOnly ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${filters.premiumOnly ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                   <Gem size={20} />
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900 leading-none">Membres Premium uniquement</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Badge 💎 obligatoire</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${filters.premiumOnly ? 'bg-primary border-primary' : 'border-slate-200'}`}>
                {filters.premiumOnly && <CheckCircle size={14} className="text-white" />}
              </div>
            </button>

            <button
              onClick={() => handlePremiumFilter('verifiedOnly')}
              className={`w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between text-left ${
                filters.verifiedOnly ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${filters.verifiedOnly ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                   <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900 leading-none">Profils Certifiés uniquement</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">L'élite vérifiée par Galant</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${filters.verifiedOnly ? 'bg-blue-500 border-blue-500' : 'border-slate-200'}`}>
                {filters.verifiedOnly && <CheckCircle size={14} className="text-white" />}
              </div>
            </button>
          </div>

          {/* Score */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Score minimum : {filters.minScore || 'Tous'}</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 4, 4.5, 4.8].map(s => (
                <button
                  key={s}
                  onClick={() => handleScoreFilter(s)}
                  className={`py-3 rounded-xl font-black text-[10px] transition-all ${
                    filters.minScore === s ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  {s === 0 ? 'TOUS' : `${s}+`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
