import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Shield, ShoppingCart, Sparkles } from 'lucide-react';
import FeatureHighlight from '../components/FeatureHighlight';
import { useAuth } from '../context/AuthContext';

const APPS = [
  {
    titleKey: 'market',
    subtitleKey: 'market_subtitle',
    href: '/market',
    icon: ShoppingCart,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    highlight: 'GOLD' as const,
  },
  {
    titleKey: 'sentinel',
    subtitleKey: 'sentinel_subtitle',
    href: '/sentinel',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-600/10',
    highlight: 'ROSE' as const,
  },
  {
    titleKey: 'partner_discovery',
    subtitleKey: 'partner_discovery_subtitle',
    href: '/partner-discovery',
    icon: MapPin,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-600/10',
    highlight: 'ROSE' as const,
  },
];

const fallbackCopy: Record<string, string> = {
  partner_discovery: 'Partenaires autour de moi',
  partner_discovery_subtitle: 'Restaurants, lounges, hotels et lieux utiles par ville ou geolocalisation.',
};

const AppsPage: React.FC = () => {
  const { t } = useAuth();
  const label = (key: string) => {
    const translated = t(key as any);
    return translated === key ? fallbackCopy[key] || key : translated;
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-8">
      <div>
        <h2 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">
          {t('apps')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 text-sm uppercase tracking-prestige">
          {t('apps_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {APPS.map((app) => {
          const Icon = app.icon;
          return (
            <FeatureHighlight key={app.href} id={`app_${app.href.replace('/', '')}`} active type={app.highlight}>
              <Link
                to={app.href}
                className="min-h-[180px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all w-full flex flex-col"
              >
                <div className={`w-12 h-12 rounded-2xl ${app.bg} ${app.color} flex items-center justify-center mb-5`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-base font-serif italic tracking-tighter text-slate-900 dark:text-white">{label(app.titleKey)}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{label(app.subtitleKey)}</p>
              </Link>
            </FeatureHighlight>
          );
        })}
      </div>

      <Link
        to="/partner-signup"
        state={{ from: '/apps' }}
        className="flex items-center gap-4 rounded-2xl border border-dashed border-primary/30 dark:border-primary/20 bg-primary/5 dark:bg-primary/10 p-5 hover:bg-primary/10 transition-all"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white">{t('partner_signup_short')}</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{t('partner_signup_short_desc')}</p>
        </div>
      </Link>
    </div>
  );
};

export default AppsPage;
