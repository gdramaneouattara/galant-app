import React from 'react';
import { X, Languages, CheckCircle, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, setLanguage, themePreference, setThemePreference, t } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10 transition-colors">
        <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
          <h3 className="text-2xl font-black italic text-slate-900 dark:text-white">Paramètres</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Apparence */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Apparence</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Clair', icon: Sun },
                { id: 'dark', label: 'Sombre', icon: Moon },
                { id: 'system', label: 'Système', icon: Monitor },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setThemePreference(opt.id as any)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                    themePreference === opt.id
                      ? 'bg-primary/5 border-primary/20 text-primary'
                      : 'bg-white dark:bg-white/5 border-slate-100 dark:border-transparent text-slate-500 hover:border-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  <opt.icon size={20} />
                  <span className="font-bold text-[10px] uppercase tracking-tighter">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Langue */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Langue</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'fr', label: 'Français' },
                { id: 'en', label: 'English' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id as 'fr' | 'en')}
                  className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${
                    language === lang.id
                      ? 'bg-primary/5 border-primary/20 text-primary'
                      : 'bg-white dark:bg-white/5 border-slate-100 dark:border-transparent text-slate-500 hover:border-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${language === lang.id ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}>
                    <Languages size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase tracking-tight">{lang.label}</span>
                    {language === lang.id && <CheckCircle size={16} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-slate-200 transition-all active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
