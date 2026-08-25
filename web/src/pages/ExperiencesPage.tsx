import React, { useEffect, useRef, useState } from 'react';
import GuidePage from './GuidePage';
import { Calendar, MapPin } from 'lucide-react';
import LockedFeatureNotice from '../components/LockedFeatureNotice';
import { useAuth } from '../context/AuthContext';

const ExperiencesPage: React.FC = () => {
  const { t } = useAuth();
  const [activeTab, setActiveTab] = useState<'AGENDA' | 'GUIDE'>('GUIDE');
  const [isTabRailCompact, setIsTabRailCompact] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || 0;
      const isMobileViewport = window.innerWidth < 768;
      const isScrollingDown = scrollY > lastScrollYRef.current;

      if (!isMobileViewport || scrollY < 48) {
        setIsTabRailCompact(false);
      } else {
        setIsTabRailCompact(isScrollingDown);
      }

      lastScrollYRef.current = scrollY;
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div className="w-full">
      <div
        className={`flex justify-center mb-8 sticky top-20 z-40 transition-transform duration-300 ease-out ${
          isTabRailCompact ? '-translate-y-3' : 'translate-y-0'
        }`}
      >
        <div
          className={`bg-white dark:bg-slate-900 p-1.5 rounded-[2rem] flex gap-1 shadow-xl border border-slate-200 dark:border-white/10 transition-all duration-300 ease-out ${
            isTabRailCompact ? 'scale-90 opacity-90 shadow-md' : 'scale-100 opacity-100'
          }`}
        >
          <button
            onClick={() => setActiveTab('GUIDE')}
            className={`flex items-center gap-2 px-5 sm:px-8 py-3 rounded-full text-xs font-medium uppercase tracking-prestige transition-all ${
              activeTab === 'GUIDE'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <MapPin size={16} />
            <span className={`${isTabRailCompact ? 'max-w-0 opacity-0 sm:max-w-none sm:opacity-100' : 'max-w-16 opacity-100'} overflow-hidden transition-all duration-300`}>
              Guide
            </span>
          </button>
          <button
            onClick={() => setActiveTab('AGENDA')}
            className={`flex items-center gap-2 px-5 sm:px-8 py-3 rounded-full text-xs font-medium uppercase tracking-prestige transition-all ${
              activeTab === 'AGENDA'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Calendar size={16} />
            <span className={`${isTabRailCompact ? 'max-w-0 opacity-0 sm:max-w-none sm:opacity-100' : 'max-w-20 opacity-100'} overflow-hidden transition-all duration-300`}>
              Agenda
            </span>
          </button>
        </div>
      </div>

      <div className="px-2">
        {activeTab === 'AGENDA' ? (
          <LockedFeatureNotice title={t('agenda')} onBack={() => setActiveTab('GUIDE')} />
        ) : (
          <GuidePage />
        )}
      </div>
    </div>
  );
};

export default ExperiencesPage;
