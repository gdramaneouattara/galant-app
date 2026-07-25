import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '@shared/lib/api';
import { showAlert } from '@shared/lib/ui-bridge';
import { useNavigate } from 'react-router-dom';
import { Rocket, Flame, ChevronsUp, Crown, CreditCard, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { useSubscription } from '@shared/hooks/useSubscription';
import { getBoostStatus } from '@shared/lib/boostStatus';

const BoostPage: React.FC = () => {
  const { user, profile, t } = useAuth();
  const navigate = useNavigate();
  const { purchaseLoading, purchaseWithPaystack } = useSubscription();
  const [activatingFree, setActivatingFree] = useState(false);

  const boostStatus = getBoostStatus(profile?.boosted_until);

  const BOOST_PLANS = useMemo(() => [
    {
      id: '1D',
      name: t('one_day'),
      priceText: `1 000 F CFA`,
      priceAmount: 1000,
      icon: Flame,
      description: t('boost_1d_desc'),
      color: 'text-orange-500',
      bg: 'bg-orange-50'
    },
    {
      id: '3D',
      name: t('three_days'),
      priceText: `2 500 F CFA`,
      priceAmount: 2500,
      savings: '17%',
      icon: ChevronsUp,
      description: t('boost_3d_desc'),
      isBest: true,
      color: 'text-white',
      bg: 'bg-secondary'
    },
    {
      id: '7D',
      name: t('seven_days'),
      priceText: `5 000 F CFA`,
      priceAmount: 5000,
      savings: '29%',
      icon: Crown,
      description: t('boost_7d_desc'),
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
  ], [t]);

  const handleFreeBoost = async () => {
    if (boostStatus.active) {
      showAlert('Déjà actif', 'Votre profil est déjà boosté.');
      return;
    }
    setActivatingFree(true);
    try {
      await apiRequest('/api/profile/boost', { method: 'POST', requireAuth: true });
      showAlert(t('success'), t('free_boost_success'));
      window.location.reload();
    } catch (error: any) {
      showAlert(t('error'), error.message);
    } finally {
      setActivatingFree(false);
    }
  };

  const handlePurchase = async (plan: any) => {
    if (boostStatus.active) {
      showAlert('Déjà actif', 'Veuillez attendre la fin de votre boost actuel.');
      return;
    }
    const ok = await purchaseWithPaystack('BOOST', plan.priceAmount, undefined, { planId: plan.id });
    if (ok) {
      showAlert(t('success'), t('boost_activated'));
      navigate('/profile');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black italic dark:text-white">{t('boost_your_profile')}</h2>
          <p className="text-slate-500 font-medium">{t('boost_subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Hero & Status */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-secondary p-10 rounded-[3rem] text-white text-center space-y-6 shadow-2xl shadow-secondary/20">
             <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto backdrop-blur-md">
                <Rocket size={40} className="animate-bounce" />
             </div>
             <h3 className="text-2xl font-black italic leading-tight">Propulsez votre visibilité</h3>
             <p className="text-sm font-medium text-white/80">
                Passez en tête de liste et multipliez vos chances de rencontre d'exception.
             </p>
          </div>

          {boostStatus.active && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-2 border-secondary/20 shadow-xl flex items-center gap-4 transition-colors">
              <div className="w-12 h-12 bg-secondary text-white rounded-2xl flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase text-secondary tracking-widest leading-none mb-1">Boost Actif</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Il reste {boostStatus.remainingLabel}</p>
              </div>
            </div>
          )}

          {/* Free Boost Card (If applicable - basic check) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/10 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center gap-3 text-primary">
              <Flame size={20} />
              <p className="text-xs font-black uppercase tracking-widest">{t('free_boost_available')}</p>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{t('free_boost_subtitle')}</p>
            <button
              onClick={handleFreeBoost}
              disabled={activatingFree || boostStatus.active}
              className="w-full py-4 rounded-2xl bg-primary/5 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-30"
            >
              {activatingFree ? <Loader2 className="animate-spin mx-auto" size={16} /> : t('activate')}
            </button>
          </div>
        </div>

        {/* Right Column: Plans */}
        <div className="md:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Sélectionnez votre plan</h4>
          <div className="space-y-4">
            {BOOST_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-8 rounded-[2.5rem] border-2 transition-all group overflow-hidden ${
                  plan.isBest ? 'bg-secondary border-secondary shadow-2xl shadow-secondary/20' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-white/5 hover:border-secondary/30'
                }`}
              >
                {plan.isBest && (
                  <div className="absolute top-0 right-0 bg-white/20 backdrop-blur-md px-6 py-2 rounded-bl-[1.5rem] text-[10px] font-black uppercase text-white tracking-widest">
                    {t('best_choice')}
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${plan.isBest ? 'bg-white/10' : plan.bg} ${plan.color}`}>
                    <plan.icon size={32} />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                       <h5 className={`text-xl font-black italic ${plan.isBest ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h5>
                       {plan.savings && <span className="bg-green-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black">-{plan.savings}</span>}
                    </div>
                    <p className={`text-sm font-medium ${plan.isBest ? 'text-white/70' : 'text-slate-500'}`}>{plan.description}</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <p className={`text-lg font-black ${plan.isBest ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.priceText}</p>
                    <button
                      onClick={() => handlePurchase(plan)}
                      disabled={purchaseLoading || boostStatus.active}
                      className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        plan.isBest
                          ? 'bg-white text-secondary hover:scale-105 active:scale-95 shadow-xl'
                          : 'bg-secondary text-white hover:scale-105 active:scale-95 shadow-lg shadow-secondary/20'
                      }`}
                    >
                      {purchaseLoading ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                      Payer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoostPage;
