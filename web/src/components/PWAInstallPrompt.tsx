import React, { useEffect, useState } from 'react';
import { Download, MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallMode = 'native' | 'ios' | 'android-manual';

const INSTALL_HELP_SEEN_KEY = 'galant_pwa_install_help_seen';

const isPwaStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

const PWAInstallPrompt: React.FC = () => {
  const location = useLocation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMode, setInstallMode] = useState<InstallMode | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const normalizedPathname = location.pathname.replace(/\/+$/, '') || '/';
  const isDiscoverRoute = normalizedPathname === '/' || normalizedPathname === '/discover-grid';

  useEffect(() => {
    if (isPwaStandalone()) return;

    let hasNativePrompt = false;
    const userAgent = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/i.test(userAgent);
    const isMobileViewport = window.innerWidth <= 768 || navigator.maxTouchPoints > 1;
    const hasSeenInstallHelp = localStorage.getItem(INSTALL_HELP_SEEN_KEY) === '1';

    const showHelp = (mode: InstallMode) => {
      setInstallMode(mode);
      setIsCompact(hasSeenInstallHelp);
      setIsVisible(true);
    };

    const beforeInstallHandler = (event: Event) => {
      event.preventDefault();
      hasNativePrompt = true;
      setInstallPrompt(event as BeforeInstallPromptEvent);
      showHelp('native');
    };

    const installedHandler = () => {
      localStorage.setItem(INSTALL_HELP_SEEN_KEY, '1');
      setIsVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', installedHandler);

    if (isIOS) {
      showHelp('ios');
    }

    const fallbackTimer = window.setTimeout(() => {
      if (!hasNativePrompt && !isIOS && (isAndroid || isMobileViewport)) {
        showHelp('android-manual');
      }
    }, 1800);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', installedHandler);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const collapseHelp = () => {
    localStorage.setItem(INSTALL_HELP_SEEN_KEY, '1');
    setIsCompact(true);
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
    } else {
      collapseHelp();
    }

    setInstallPrompt(null);
  };

  if (!isVisible || !isDiscoverRoute) return null;

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={() => setIsCompact(false)}
        className="md:hidden fixed bottom-24 left-4 z-[100] flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/95 px-4 py-3 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl active:scale-95 transition-all"
        aria-label="Aide pour installer Galant"
      >
        <Smartphone size={16} className="text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest">Installer</span>
      </button>
    );
  }

  return (
    <div className="md:hidden fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <img src="/galant-logo-web.png" alt="Galant" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h4 className="font-black italic text-sm uppercase tracking-tighter text-primary">Galant App</h4>
              <p className="text-xs text-slate-400 font-medium">Installez Galant sur votre ecran d'accueil</p>
            </div>
          </div>
          <button onClick={collapseHelp} className="p-2 text-slate-500 hover:text-white transition-colors" aria-label="Reduire">
            <X size={18} />
          </button>
        </div>

        {installMode === 'native' && installPrompt ? (
          <button
            onClick={handleInstallClick}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 active:scale-95 transition-all"
          >
            <Download size={18} />
            Installer maintenant
          </button>
        ) : installMode === 'ios' ? (
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[11px] font-medium leading-relaxed text-slate-300">
              Sur votre iPhone : cliquez sur le bouton{' '}
              <span className="text-white font-bold inline-flex items-center gap-1 mx-1">
                <Share size={14} /> Partager
              </span>
              puis sur{' '}
              <span className="text-white font-bold inline-flex items-center gap-1 mx-1">
                <PlusSquare size={14} /> Sur l'ecran d'accueil
              </span>
              .
            </p>
            <div className="flex justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
            </div>
          </div>
        ) : installMode === 'android-manual' ? (
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[11px] font-medium leading-relaxed text-slate-300">
              Sur Android : ouvrez le menu{' '}
              <span className="text-white font-bold inline-flex items-center gap-1 mx-1">
                <MoreVertical size={14} /> Chrome
              </span>
              puis choisissez <span className="text-white font-bold mx-1">Installer l'application</span> ou{' '}
              <span className="text-white font-bold mx-1">Ajouter a l'ecran d'accueil</span>.
            </p>
            <p className="text-[10px] font-medium leading-relaxed text-slate-400">
              Si Chrome affiche seulement <span className="text-white font-bold">Ouvrir Galant</span>, l'app est
              déjà installee par le navigateur : recherchez Galant dans la liste des applications, puis maintenez son
              icône pour la remettre sur l'ecran d'accueil.
            </p>
            <button
              onClick={collapseHelp}
              className="w-full bg-primary text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
            >
              J'ai compris
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
