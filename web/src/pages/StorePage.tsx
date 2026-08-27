import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeft,
  Crown,
  Gem,
  Rocket,
  Star,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Waves,
  Award,
  Sparkles,
  LayoutGrid,
  Heart,
  Flame,
  Camera,
  MapPinned,
  SlidersHorizontal as FiltersIcon
} from 'lucide-react';
import { useSubscription, PurchaseType } from '@shared/hooks/useSubscription';
import { showAlert } from '@shared/lib/ui-bridge';
import { apiRequest } from '@shared/lib/api';
import { getBoostStatus } from '@shared/lib/boostStatus';
import WaveManualPaymentModal from '../components/WaveManualPaymentModal';
import type { WaveManualIntent } from '@shared/hooks/useSubscription';

const StorePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, language } = useAuth();
  const { createWaveManualPayment, submitWaveManualProof, purchaseLoading } = useSubscription();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [waveIntent, setWaveIntent] = useState<WaveManualIntent | null>(null);

  const boostStatus = getBoostStatus(profile?.boosted_until);
  const hasPartnerDiscoveryAccess = !!(profile?.is_premium || profile?.is_vip || profile?.partner_discovery_unlocked);
  const getPrice = (key: string, fallback: number) => {
    const value = Number(pricing?.PRICES?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const labels = language === 'en'
    ? {
        alreadyTitle: 'Already available',
        alreadyBody: 'Partners around me is already included in your access.',
        error: 'Error',
        subtitle: 'Privileges & Exclusives',
        statusLabel: 'Your current status',
        privilegeMember: 'Privilege Member',
        classicMember: 'Classic Member',
        active: 'Active',
        subscriptions: 'Subscriptions',
        oneMonth: '1 month',
        threeMonths: '3 months',
        perMonth: '/ month',
        standardName: 'Monthly Premium',
        standardTagline: 'The essential Galant access for 30 days.',
        standardValue: 'Full access',
        privilegeName: 'Privilege 3 Months',
        privilegeTagline: 'Longer access, more benefits, better monthly value.',
        privilegeValue: 'Best value',
        privilegePriceNote: 'around 3,333 F / month',
        standardFeatures: [
          'Priority swipes',
          'See who liked you',
          'Messages and chats unlocked',
          'Stories included',
          'AI assistant and advanced filters',
          'Invisible mode included',
          'Up to 6 profile photos',
          'Nearby partners included'
        ],
        privilegeFeatures: [
          'All Monthly Premium benefits',
          '3 months of access',
          '3 free Roses every month',
          'Priority support',
          'Invisible mode included',
          'Better price: around 3,333 F / month'
        ],
        processing: 'Processing...',
        subscribe: 'Subscribe',
        recommended: 'Recommended',
        choosePrivilege: 'Choose Privilege',
        aLaCarte: 'À la Carte',
        rosesVisibility: 'Rose Balance & Visibility',
        immediate: 'Instant action',
        destinyBoosts: 'Destiny Accelerators',
        passes: 'Passes & Unlocks',
        included: 'Included',
        paymentMethod: 'Payment method',
        waveMode: 'Wave payment',
        wavePendingTitle: 'Wave payment pending',
        wavePendingBody: 'Your Wave transaction has been submitted. An admin will validate it before activation.',
        rosePacks: [
          { id: 'ROSE_1', type: 'ROSE_PACK' as PurchaseType, label: '1 Rose to use', price: 500, icon: '🌹' },
          { id: 'ROSE_5', type: 'ROSE_PACK' as PurchaseType, label: 'Pack of 5 Roses', price: 2500, icon: '✨' },
          { id: 'ROSE_10', type: 'ROSE_PACK' as PurchaseType, label: 'Pack of 10 Roses', price: 5000, icon: '🔥' },
          { id: 'GOLDEN_ROSE', type: 'GOLDEN_ROSE' as PurchaseType, label: 'Golden Rose (3h)', price: 2500, icon: '🏆' },
        ],
        boosts: [
          { id: '1D', label: '1 Day Boost', price: getPrice('BOOST_1D', 1000), color: 'text-indigo-500', icon: Flame },
          { id: '3D', label: '3 Day Boost', price: getPrice('BOOST_3D', 2500), color: 'text-purple-600', icon: Rocket },
          { id: '7D', label: '7 Day Boost', price: getPrice('BOOST_7D', 5000), color: 'text-primary', icon: Star },
        ],
          unlocks: [
            { id: 'DISCOVER_GRID_UNLOCK', type: 'DISCOVER_GRID_UNLOCK' as PurchaseType, label: 'Gallery Access', sub: '100 profile quota', price: 1000, icon: LayoutGrid, color: 'text-indigo-500' },
            { id: 'DISCOVER_FILTERS_UNLOCK', type: 'DISCOVER_FILTERS_UNLOCK' as PurchaseType, label: 'Filters Pass', sub: `For ${pricing?.PRICES?.DISCOVER_FILTERS_DAYS || 3} days`, price: pricing?.PRICES?.DISCOVER_FILTERS_UNLOCK || 500, icon: FiltersIcon, color: 'text-purple-500' },
            { id: 'LIKES_INBOX_2H', type: 'LIKES_INBOX_2H' as PurchaseType, label: 'Unlock Likes', sub: 'For 2 hours', price: 1000, icon: Heart, color: 'text-rose-500' },
            { id: 'STORY_UPLOAD', type: 'STORY_UPLOAD' as PurchaseType, label: 'Post a Story', sub: 'One-time post', price: 500, icon: Camera, color: 'text-amber-500' },
            { id: 'PARTNER_DISCOVERY_UNLOCK', type: 'PARTNER_DISCOVERY_UNLOCK' as PurchaseType, label: 'Partners around me', sub: 'Direct Google search', price: 500, icon: MapPinned, color: 'text-emerald-500' },
          ],
        security: 'Temporary Wave mode: pay the exact amount, enter your Wave transaction ID and phone number, then wait for admin validation.'
      }
    : {
        alreadyTitle: 'Déjà disponible',
        alreadyBody: 'Partenaires autour de moi est déjà inclus dans votre accès.',
        error: 'Erreur',
        subtitle: 'Privilèges & Exclusivités',
        statusLabel: 'Votre Statut Actuel',
        privilegeMember: 'Membre Privilège',
        classicMember: 'Membre Classique',
        active: 'Actif',
        subscriptions: 'Abonnements',
        oneMonth: '1 mois',
        threeMonths: '3 mois',
        perMonth: '/ mois',
        standardName: 'Premium Mensuel',
        standardTagline: 'L acces essentiel a Galant pendant 30 jours.',
        standardValue: 'Acces complet',
        privilegeName: 'Privilege 3 Mois',
        privilegeTagline: 'Plus long, plus avantageux, avec un meilleur prix mensuel.',
        privilegeValue: 'Meilleur choix',
        privilegePriceNote: 'environ 3 333 F / mois',
        standardFeatures: [
          'Swipes prioritaires',
          'Voir les profils qui vous ont like',
          'Messages et conversations debloques',
          'Stories incluses',
          'Assistant IA et filtres avances',
          'Mode invisible inclus',
          'Jusqu a 6 photos de profil',
          'Partenaires autour de moi inclus'
        ],
        privilegeFeatures: [
          'Tous les avantages Premium Mensuel',
          '3 mois d acces',
          '3 Roses offertes chaque mois',
          'Support prioritaire',
          'Mode invisible inclus',
          'Meilleur prix : environ 3 333 F / mois'
        ],
        processing: 'Traitement...',
        subscribe: "S'abonner",
        recommended: 'Recommandé',
        choosePrivilege: 'Choisir le Privilège',
        aLaCarte: 'À la Carte',
        rosesVisibility: 'Solde de Roses & Visibilité',
        immediate: 'Action Immédiate',
        destinyBoosts: 'Accélérateurs de Destin',
        passes: 'Pass & Déblocages',
        included: 'Inclus',
        paymentMethod: 'Mode de paiement',
        waveMode: 'Paiement Wave',
        wavePendingTitle: 'Paiement Wave en attente',
        wavePendingBody: 'Votre transaction Wave a ete soumise. Un admin la validera avant activation.',
        rosePacks: [
          { id: 'ROSE_1', type: 'ROSE_PACK' as PurchaseType, label: '1 Rose à consommer', price: 500, icon: '🌹' },
          { id: 'ROSE_5', type: 'ROSE_PACK' as PurchaseType, label: 'Pack 5 Roses', price: 2500, icon: '✨' },
          { id: 'ROSE_10', type: 'ROSE_PACK' as PurchaseType, label: 'Pack 10 Roses', price: 5000, icon: '🔥' },
          { id: 'GOLDEN_ROSE', type: 'GOLDEN_ROSE' as PurchaseType, label: "Rose d'Or (3h)", price: 2500, icon: '🏆' },
        ],
        boosts: [
          { id: '1D', label: 'Boost 1 Jour', price: getPrice('BOOST_1D', 1000), color: 'text-indigo-500', icon: Flame },
          { id: '3D', label: 'Boost 3 Jours', price: getPrice('BOOST_3D', 2500), color: 'text-purple-600', icon: Rocket },
          { id: '7D', label: 'Boost 7 Jours', price: getPrice('BOOST_7D', 5000), color: 'text-primary', icon: Star },
        ],
          unlocks: [
            { id: 'DISCOVER_GRID_UNLOCK', type: 'DISCOVER_GRID_UNLOCK' as PurchaseType, label: 'Accès Galerie', sub: 'Quota 100 profils', price: 1000, icon: LayoutGrid, color: 'text-indigo-500' },
            { id: 'DISCOVER_FILTERS_UNLOCK', type: 'DISCOVER_FILTERS_UNLOCK' as PurchaseType, label: 'Pass Filtres', sub: `Pendant ${pricing?.PRICES?.DISCOVER_FILTERS_DAYS || 3} jours`, price: pricing?.PRICES?.DISCOVER_FILTERS_UNLOCK || 500, icon: FiltersIcon, color: 'text-purple-500' },
            { id: 'LIKES_INBOX_2H', type: 'LIKES_INBOX_2H' as PurchaseType, label: 'Débloquer les Likes', sub: 'Pendant 2 heures', price: 1000, icon: Heart, color: 'text-rose-500' },
            { id: 'STORY_UPLOAD', type: 'STORY_UPLOAD' as PurchaseType, label: 'Publier une Story', sub: 'Publication ponctuelle', price: 500, icon: Camera, color: 'text-amber-500' },
            { id: 'PARTNER_DISCOVERY_UNLOCK', type: 'PARTNER_DISCOVERY_UNLOCK' as PurchaseType, label: 'Partenaires autour de moi', sub: 'Recherche Google directe', price: 500, icon: MapPinned, color: 'text-emerald-500' },
          ],
        security: 'Mode Wave temporaire : payez le montant exact, saisissez l ID transaction Wave et votre numero, puis attendez la validation admin.'
      };

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    apiRequest<any>('/api/payments/pricing', { requireAuth: true })
      .then((data) => {
        if (!cancelled) setPricing(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const handlePurchase = async (type: PurchaseType, id: string, amount: number) => {
    if (type === 'PARTNER_DISCOVERY_UNLOCK' && hasPartnerDiscoveryAccess) {
      showAlert(labels.alreadyTitle, labels.alreadyBody);
      return;
    }

    setLoadingId(id);
    try {
      const intent = await createWaveManualPayment(type, amount, undefined, { planId: id });
      if (intent) setWaveIntent(intent);
    } catch (error: any) {
      showAlert(labels.error, error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const submitWaveTransaction = async ({ transactionId, phone }: { transactionId: string; phone: string }) => {
    if (!waveIntent) return;
    const ok = await submitWaveManualProof(waveIntent.reference_code, transactionId, phone);
    if (ok) {
      setWaveIntent(null);
      showAlert(labels.wavePendingTitle, labels.wavePendingBody);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 space-y-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 rounded-2xl text-slate-400 hover:text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-sans  tracking-tighter text-slate-900 dark:text-white">Store Galant</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-prestige text-[10px]">{labels.subtitle}</p>
        </div>
      </div>

      {/* Hero: Account Status */}
      <div className="bg-slate-900 dark:bg-slate-800 p-8 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="flex items-center gap-6 relative z-10 text-center md:text-left">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400">
            <Award size={32} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-prestige text-slate-400 mb-1">{labels.statusLabel}</p>
            <h3 className="text-2xl font-sans  tracking-tighter uppercase leading-none">
              {profile?.is_premium ? labels.privilegeMember : labels.classicMember}
            </h3>
          </div>
        </div>
        <div className="flex gap-3 relative z-10">
          <div className="bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex flex-col items-center">
            <span className="text-xl font-black text-amber-500 leading-none">{profile?.rose_balance || 0}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Roses</span>
          </div>
          {boostStatus.active && (
            <div className="bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex flex-col items-center">
              <span className="text-xl font-black text-secondary leading-none">{labels.active}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Boost</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-lg dark:border-white/5 dark:bg-slate-900">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{labels.paymentMethod}</p>
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#09a5db] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">
          <Waves size={15} />
          {labels.waveMode}
        </div>
      </div>

      {/* SECTION 1: ABONNEMENTS */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600">
            <Crown size={20} fill="currentColor" />
          </div>
          <h3 className="text-2xl font-sans  tracking-tighter text-slate-900 dark:text-white uppercase">{labels.subscriptions}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Standard */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h4 className="text-xl font-sans  tracking-tighter uppercase text-slate-900 dark:text-white leading-none">{labels.standardName}</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">{labels.standardTagline}</p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400">{labels.oneMonth}</div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">5 000 F</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{labels.perMonth}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                <Crown size={13} />
                {labels.standardValue}
              </div>
              <ul className="space-y-3">
                {labels.standardFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <CheckCircle2 size={14} className="text-green-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handlePurchase('PREMIUM', 'MONTHLY', 5000)}
              disabled={!!loadingId || purchaseLoading}
              className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-prestige hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              {loadingId === 'MONTHLY' ? labels.processing : labels.subscribe}
            </button>
          </div>

          {/* Plan Privilège */}
          <div className="bg-slate-950 p-8 rounded-[3rem] border-2 border-primary/30 shadow-2xl space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="bg-primary text-white px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest animate-pulse">{labels.recommended}</div>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2 pr-16">
                  <h4 className="text-xl font-sans  tracking-tighter uppercase text-white leading-none">{labels.privilegeName}</h4>
                  <p className="text-xs font-semibold text-slate-400 leading-relaxed">{labels.privilegeTagline}</p>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-amber-400">{labels.threeMonths}</div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">10 000 F</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">/ 3 mois</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-primary/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Crown size={13} />
                  {labels.privilegeValue}
                </span>
                <span className="inline-flex rounded-2xl bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {labels.privilegePriceNote}
                </span>
              </div>
              <ul className="space-y-3">
                {labels.privilegeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <CheckCircle2 size={14} className="text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handlePurchase('PREMIUM', 'QUARTERLY', 10000)}
              disabled={!!loadingId || purchaseLoading}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-prestige hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-500/20"
            >
              {loadingId === 'QUARTERLY' ? labels.processing : labels.choosePrivilege}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: ACHATS PONCTUELS */}
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-primary">
            <Zap size={20} fill="currentColor" />
          </div>
          <h3 className="text-2xl font-sans  tracking-tighter text-slate-900 dark:text-white uppercase">{labels.aLaCarte}</h3>
        </div>

        <div className="space-y-12">
          {/* Roses & Visibilité - HIDDEN AS PER USER REQUEST */}
          {/*
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{labels.rosesVisibility}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {labels.rosePacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase(pack.type, pack.id, pack.price)}
                  disabled={!!loadingId || purchaseLoading}
                  className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg flex items-center justify-between group hover:border-amber-500/30 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                      {pack.icon}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-none truncate">{pack.label}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{labels.immediate}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black">{pack.price} F</div>
                </button>
              ))}
            </div>
          </div>
          */}

          {/* Boosts */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{labels.destinyBoosts}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {labels.boosts.map((boost) => (
                <button
                  key={boost.id}
                  onClick={() => handlePurchase('BOOST', boost.id, boost.price)}
                  disabled={!!loadingId || purchaseLoading || boostStatus.active}
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-lg flex flex-col items-center gap-4 group hover:border-primary/30 transition-all active:scale-95"
                >
                  <div className={`w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center ${boost.color} transition-transform group-hover:rotate-12`}>
                    <boost.icon size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{boost.label}</p>
                    <p className="text-[10px] font-black text-primary mt-2">{boost.price} F</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Déblocages Spéciaux */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{labels.passes}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {labels.unlocks.map((item) => {
                const alreadyGranted = item.type === 'PARTNER_DISCOVERY_UNLOCK' && hasPartnerDiscoveryAccess;
                const disabled = !!loadingId || purchaseLoading || alreadyGranted;
                return (
                <button
                  key={item.id}
                  onClick={() => handlePurchase(item.type, item.id, item.price)}
                  disabled={disabled}
                  className={`bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg flex items-center justify-between group transition-all active:scale-95 ${
                    alreadyGranted ? 'opacity-70 cursor-not-allowed' : 'hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${item.color}`}>
                      <item.icon size={24} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-none truncate">{item.label}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{item.sub}</p>
                    </div>
                  </div>
                  <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black">
                    {alreadyGranted ? labels.included : `${item.price} F`}
                  </div>
                </button>
              );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Security note */}
      <div className="max-w-md mx-auto p-8 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/10 flex flex-col items-center gap-4 text-center">
        <ShieldCheck className="text-emerald-500" size={32} />
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider">
          {labels.security}
        </p>
      </div>

      <WaveManualPaymentModal
        isOpen={!!waveIntent}
        intent={waveIntent}
        loading={purchaseLoading}
        onClose={() => setWaveIntent(null)}
        onSubmit={submitWaveTransaction}
      />
    </div>
  );
};

export default StorePage;
