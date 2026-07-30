import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Crown, Gem, MapPin, Rocket, ShieldCheck, Sparkles, ShoppingCart, Shield } from 'lucide-react';

const APPS = [
  {
    title: 'Sorties',
    subtitle: 'Agenda, lieux et idees de rendez-vous.',
    href: '/experiences',
    icon: Calendar,
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
  },
  {
    title: 'Guide Galant',
    subtitle: 'Les meilleures adresses pour vos rencontres.',
    href: '/guide',
    icon: MapPin,
    color: 'text-primary',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    title: 'Premium',
    subtitle: 'IA, mode invisible et avantages exclusifs.',
    href: '/premium',
    icon: Crown,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    title: 'Boost',
    subtitle: 'Gagnez plus de visibilite dans Decouverte.',
    href: '/boost',
    icon: Rocket,
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    title: 'Certification',
    subtitle: 'Verifiez votre identite et inspirez confiance.',
    href: '/verify',
    icon: ShieldCheck,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    title: 'Roses',
    subtitle: 'Roses recues, solde et historique.',
    href: '/roses',
    icon: Gem,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
  },
  {
    title: 'Le Marché',
    subtitle: 'Comparez les prix et optimisez vos achats.',
    href: '/market',
    icon: ShoppingCart,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    title: 'La Sentinelle',
    subtitle: 'Securite privee et appel fantome discret.',
    href: '/sentinel',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-600/10',
  },
];

const AppsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-8">
      <div>
        <h2 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white leading-none">
          Apps
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-3 text-sm uppercase tracking-prestige">
          Services utiles pour vos rencontres
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {APPS.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.href}
              to={app.href}
              className="min-h-[180px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl ${app.bg} ${app.color} flex items-center justify-center mb-5`}>
                <Icon size={24} />
              </div>
              <h3 className="text-base font-serif italic tracking-tighter text-slate-900 dark:text-white">{app.title}</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{app.subtitle}</p>
            </Link>
          );
        })}
      </div>

      <Link
        to="/partner-signup"
        className="flex items-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 hover:bg-primary/10 transition-all"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white">Rejoignez le Guide Galant</p>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Votre etablissement aussi merite l'elegance.</p>
        </div>
      </Link>
    </div>
  );
};

export default AppsPage;
