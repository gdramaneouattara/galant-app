import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const PWAInstallPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Détection Android / Chrome (BeforeInstallPromptEvent)
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 2. Détection iOS (Safari)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true);
      setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setInstallPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <img src="/pwa-192x192.png" alt="Galant" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h4 className="font-black italic text-sm uppercase tracking-tighter text-primary">Galant App</h4>
              <p className="text-xs text-slate-400 font-medium">Installez l'app sur votre écran d'accueil</p>
            </div>
          </div>
          <button onClick={() => setIsVisible(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Contenu spécifique selon l'OS */}
        {installPrompt ? (
          /* ANDROID / CHROME */
          <button
            onClick={handleInstallClick}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
          >
            <Download size={18} />
            Installer maintenant
          </button>
        ) : showIOSPrompt ? (
          /* iOS SAFARI */
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[11px] font-medium leading-relaxed text-slate-300">
              Sur votre iPhone : cliquez sur le bouton <span className="text-white font-bold inline-flex items-center gap-1 mx-1"><Share size={14} /> Partager</span>
              puis sur <span className="text-white font-bold inline-flex items-center gap-1 mx-1"><PlusSquare size={14} /> Sur l'écran d'accueil</span>.
            </p>
            <div className="flex justify-center">
               <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
