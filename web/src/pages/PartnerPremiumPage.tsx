import React, { useState } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  Rocket,
  BarChart3,
  Bell,
  Check,
  CreditCard,
  Sparkles,
  Zap,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '@shared/hooks/useSubscription';
import { showAlert } from '@shared/lib/ui-bridge';

const PartnerPremiumPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, reloadUser } = useAuth();
  const { purchaseWithPaystack, purchaseLoading } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }
    navigate('/partner');
  };

  const PLANS = [
    {
      id: 'VISIBILITY',
      title: 'Visibilité',
      price: '25 000 F',
      priceAmount: 25000,
      description: 'Idéal pour les nouveaux établissements.',
      features: [
        'Affichage prioritaire',
        'Badge Partenaire Certifié',
        'Lien d\'itinéraire direct',
        'Statistiques de base'
      ],
      color: 'text-blue-500',
      border: 'border-blue-200',
      bg: 'bg-blue-50/50',
      btn: 'bg-blue-500'
    },
    {
      id: 'PRESTIGE',
      title: 'Prestige Business',
      price: '50 000 F',
      priceAmount: 50000,
      description: 'Le choix des leaders du lifestyle.',
      features: [
        'Affichage ultra-prioritaire',
        'Badge Or Certifié',
        'Événements illimités',
        'Notifications Proximité',
        'Analyses d\'audience complètes'
      ],
      color: 'text-rose-500',
      border: 'border-rose-200',
      bg: 'bg-rose-50/50',
      btn: 'bg-primary',
      isBest: true
    }
  ];

  const handleSubscribe = async (plan: any) => {
    setLoadingPlan(plan.id);
    try {
      const ok = await purchaseWithPaystack('PARTNER_PREMIUM', plan.priceAmount, undefined, { planId: plan.id });
      if (ok) {
        await reloadUser();
        showAlert(t('success'), t('purchase_activated'));
      }
    } catch (e: any) {
      showAlert('Erreur', e.message || 'Impossible d\'initialiser le paiement.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-serif italic tracking-tighter text-slate-900 dark:text-white">Abonnement Business</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-prestige text-[10px]">Propulsez votre établissement</p>
        </div>
      </div>

      {/* Hero */}
      <div className="text-center space-y-4 max-w-lg mx-auto">
        <div className="w-20 h-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary mb-6 animate-bounce-slow">
          <Rocket size={40} />
        </div>
        <h1 className="text-4xl font-serif italic tracking-tighter text-slate-900 dark:text-white">Devenez une destination de choix</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          Rejoignez le cercle fermé des établissements certifiés Galant et touchez une audience de prestige.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative p-10 rounded-[3.5rem] border-2 transition-all duration-500 flex flex-col justify-between hover:shadow-2xl ${
              plan.isBest
                ? 'bg-slate-900 dark:bg-slate-900 border-primary text-white scale-105 z-10'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-900 dark:text-white'
            }`}
          >
            {plan.isBest && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                Recommandé
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className={`text-2xl font-serif italic tracking-tighter ${plan.isBest ? 'text-white' : plan.color}`}>{plan.title}</h3>
                <p className={`text-xs font-medium mt-1 ${plan.isBest ? 'text-slate-400' : 'text-slate-400'}`}>{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="text-sm font-medium opacity-60">/ mois</span>
              </div>

              <div className="space-y-4 pt-4">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${plan.isBest ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSubscribe(plan)}
              disabled={!!loadingPlan || purchaseLoading}
              className={`w-full mt-10 py-5 rounded-2xl font-black text-xs uppercase tracking-prestige flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                plan.isBest ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-black'
              }`}
            >
              {loadingPlan === plan.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
              ) : (
                <>
                  <CreditCard size={18} /> S'abonner maintenant
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Security note */}
      <div className="max-w-md mx-auto p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 flex items-center gap-4">
        <ShieldCheck className="text-emerald-500 flex-shrink-0" size={24} />
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider">
          Paiements 100% sécurisés par Paystack. Cartes bancaires, Orange Money, MTN, Moov et Wave acceptés.
        </p>
      </div>
    </div>
  );
};

export default PartnerPremiumPage;
