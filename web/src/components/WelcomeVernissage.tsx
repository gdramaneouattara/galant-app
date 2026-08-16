import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LayoutGrid, Shield, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WelcomeVernissageProps {
  onComplete: () => void;
}

const STEPS = {
  fr: [
    {
      title: "Bienvenue dans l'Elite",
      subtitle: "L'UNIVERS GALANT",
      description: "Vous venez de rejoindre un cercle restreint où chaque rencontre est une promesse d'élégance et de distinction.",
      icon: Sparkles,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'La Galerie & Le Marché',
      subtitle: 'DECOUVERTE & EFFICACITE',
      description: 'Parcourez les profils avec fluidite et comparez les meilleures offres du marche ivoirien pour vos cadeaux de prestige.',
      icon: LayoutGrid,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'La Sentinelle',
      subtitle: 'VOTRE ANGE GARDIEN',
      description: 'Profitez de vos moments en toute sérénité. Notre module de sécurité veille sur vous et vos proches, en toute discrétion.',
      icon: Shield,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ],
  en: [
    {
      title: 'Welcome to the Elite',
      subtitle: 'THE GALANT UNIVERSE',
      description: 'You have joined a select circle where every encounter carries elegance and distinction.',
      icon: Sparkles,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'Gallery & Market',
      subtitle: 'DISCOVERY & EFFICIENCY',
      description: 'Browse profiles smoothly and compare the best Ivorian market offers for your prestige gifts.',
      icon: LayoutGrid,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'Sentinel',
      subtitle: 'YOUR GUARDIAN ANGEL',
      description: 'Enjoy your moments with peace of mind. Our safety module watches over you and your loved ones discreetly.',
      icon: Shield,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    }
  ]
};

const WelcomeVernissage: React.FC<WelcomeVernissageProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { language } = useAuth();
  const steps = STEPS[language] || STEPS.fr;

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const finalLabel = language === 'en' ? 'ENTER THE CIRCLE' : 'ENTRER DANS LE CERCLE';
  const nextLabel = language === 'en' ? 'DISCOVER' : 'DECOUVRIR';

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg space-y-12 text-center"
        >
          <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className={`w-full h-full rounded-[2.5rem] ${step.bg} flex items-center justify-center ${step.color} shadow-2xl shadow-current/20`}
            >
              <Icon size={56} strokeWidth={1.5} />
            </motion.div>
            <div className="absolute -inset-4 bg-white/5 rounded-full blur-3xl -z-10 animate-pulse" />
          </div>

          <div className="space-y-4 px-6">
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 0.5, letterSpacing: '0.25em' }}
              className="text-white text-[10px] font-black uppercase tracking-prestige"
            >
              {step.subtitle}
            </motion.p>
            <h2 className="text-5xl font-serif italic tracking-tighter text-white leading-tight">
              {step.title}
            </h2>
            <p className="text-slate-400 font-medium text-lg leading-relaxed pt-2">
              {step.description}
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 transition-all duration-500 rounded-full ${i === currentStep ? 'w-8 bg-primary' : 'w-1.5 bg-white/10'}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-full bg-white text-slate-900 py-6 rounded-3xl font-black text-xs uppercase tracking-prestige flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-10"
          >
            {currentStep === steps.length - 1 ? (
              <>{finalLabel} <Check size={18} /></>
            ) : (
              <>{nextLabel} <ChevronRight size={18} /></>
            )}
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 -z-20 pointer-events-none rotate-12" />
    </div>
  );
};

export default WelcomeVernissage;
