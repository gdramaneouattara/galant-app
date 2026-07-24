import React from 'react';
import { X, Languages, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-2xl font-black italic">Paramètres</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-300">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Langue */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Langue de l'application</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'fr', label: 'Français' },
                { id: 'en', label: 'English' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id as 'fr' | 'en')}
                  className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${
                    language === lang.id ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${language === lang.id ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
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

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100/50 text-center">
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
              D'autres options de personnalisation arrivent bientôt pour parfaire votre élégance.
            </p>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
