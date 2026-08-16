import React from 'react';
import { X, Languages, CheckCircle, Sun, Moon, Monitor, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
  exportingData?: boolean;
  deletingAccount?: boolean;
}

const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExportData,
  onDeleteAccount,
  exportingData = false,
  deletingAccount = false,
}) => {
  const { language, setLanguage, themePreference, setThemePreference, t } = useAuth();
  const labels = language === 'en'
    ? {
        settings: 'Settings',
        appearance: 'Appearance',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        privacy: 'Privacy & data',
        preparing: 'Preparing...',
        deleting: 'Deleting...',
        close: 'Close'
      }
    : {
        settings: 'Paramètres',
        appearance: 'Apparence',
        light: 'Clair',
        dark: 'Sombre',
        system: 'Système',
        privacy: 'Confidentialité & données',
        preparing: 'Préparation...',
        deleting: 'Suppression...',
        close: 'Fermer'
      };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10 transition-colors flex flex-col">
        <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
          <h3 className="text-2xl font-black italic text-slate-900 dark:text-white">{labels.settings}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full text-slate-300" aria-label={labels.close}>
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{labels.appearance}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: labels.light, icon: Sun },
                { id: 'dark', label: labels.dark, icon: Moon },
                { id: 'system', label: labels.system, icon: Monitor },
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

          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{t('language')}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'fr', label: 'Francais' },
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

          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{labels.privacy}</p>
            <div className="space-y-3">
              <button
                onClick={onExportData}
                disabled={exportingData}
                className="w-full p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-transparent hover:border-blue-200 dark:hover:bg-white/10 transition-all flex items-center gap-4 text-left disabled:opacity-60"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <span className="flex-1 font-black text-sm uppercase tracking-tight text-slate-700 dark:text-slate-300">
                  {exportingData ? labels.preparing : t('download_my_data')}
                </span>
              </button>

              <button
                onClick={onDeleteAccount}
                disabled={deletingAccount}
                className="w-full p-4 rounded-2xl bg-red-50/70 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 hover:border-red-200 dark:hover:bg-red-900/20 transition-all flex items-center gap-4 text-left disabled:opacity-60"
              >
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <span className="flex-1 font-black text-sm uppercase tracking-tight text-red-600">
                  {deletingAccount ? labels.deleting : t('delete_my_account')}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 text-center">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 dark:shadow-none hover:bg-black dark:hover:bg-slate-200 transition-all active:scale-95"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
