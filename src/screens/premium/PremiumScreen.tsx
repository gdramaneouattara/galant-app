import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { Crown, Gem, Gift, Package, LucideProps, CreditCard, Play, Lock, Sparkles, Zap, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';

import { useSubscription } from '../../hooks/useSubscription';

type PremiumPlan = {
  id: string;
  sku: string;
  name: string;
  priceText: string;
  priceAmount: number;
  savings?: string;
  icon: (props: LucideProps) => React.ReactElement;
  description: string;
  isBest?: boolean;
};

const PremiumScreen: React.FC = () => {
  // Quality requirement: /api/payments/initialize, /api/payments/verify
  const navigation = useNavigation();
  const { refreshCurrentUser, currentUser, t } = useApp();
  const { purchaseLoading, purchaseWithPaystack, purchaseWithStore, initIAP, endIAP, androidOfferTokenBySku } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const PREMIUM_PLANS: PremiumPlan[] = useMemo(() => [
    {
      id: 'MONTHLY',
      sku: process.env.EXPO_PUBLIC_PREMIUM_MONTHLY_SKU || 'premium_1_month',
      name: t('one_month'),
      priceText: `5 000 F CFA`,
      priceAmount: 5000,
      icon: (props) => <Package {...props} />,
      description: t('premium_desc'),
    },
    {
      id: 'QUARTERLY',
      sku: process.env.EXPO_PUBLIC_PREMIUM_QUARTERLY_SKU || 'premium_3_months',
      name: t('three_months'),
      priceText: `10 000 F CFA`,
      priceAmount: 10000,
      savings: t('save_33'),
      icon: (props) => <Gift {...props} />,
      description: t('premium_desc'),
      isBest: true,
    },
  ], [t]);

  useEffect(() => {
    void initIAP(PREMIUM_PLANS.map(p => p.sku), true);
    return () => { void endIAP(); };
  }, [PREMIUM_PLANS]);

  const subscribePaystack = async (plan: PremiumPlan) => {
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    const ok = await purchaseWithPaystack('PREMIUM', plan.priceAmount, undefined, { planId: plan.id });
    if (ok) {
      await refreshCurrentUser();
      Alert.alert(t('success'), t('premium_active'));
      navigation.goBack();
    }
    setLoadingPlan(null);
  };

  const subscribeStore = async (plan: PremiumPlan) => {
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    const ok = await purchaseWithStore(plan.sku, 'PREMIUM', undefined, true, androidOfferTokenBySku[plan.sku]);
    if (ok) {
      await refreshCurrentUser();
      Alert.alert(t('success'), t('premium_active'));
      navigation.goBack();
    }
    setLoadingPlan(null);
  };

  const PLAN_COMPARISON = useMemo(() => [
    { feature: t('discover'), availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui' } },
    { feature: t('messages'), availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui' } },
    { feature: t('ai_assistant_title'), availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui' } },
    { feature: t('stories'), availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui' } },
    { feature: t('invisible_mode_title'), availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui' } },
    { feature: 'Elite Status', availability: { MONTHLY: 'Unlimited', QUARTERLY: 'Unlimited' } },
  ], [t]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}><Crown color="#fff" size={42} /></View>
          <Text style={styles.title}>{t('premium_join')}</Text>
          <Text style={styles.subtitle}>{t('premium_subtitle')}</Text>
        </View>

        <View style={styles.benefitsSection}>
          {[
            { icon: Sparkles, color: "#e11d48", bg: "#fff1f2", title: t('ai_assistant_title'), desc: t('ai_assistant_desc') },
            { icon: Zap, color: "#0ea5e9", bg: "#f0f9ff", title: t('visibility_boost_title'), desc: t('visibility_boost_desc') },
            { icon: EyeOff, color: "#db2777", bg: "#fdf2f8", title: t('invisible_mode_title'), desc: t('invisible_mode_desc') },
            { icon: ShieldCheck, color: "#16a34a", bg: "#f0fdf4", title: t('certified_badge_title'), desc: t('certified_badge_desc') },
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: benefit.bg }]}><benefit.icon color={benefit.color} size={24} /></View>
              <View style={styles.benefitTextWrap}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {PREMIUM_PLANS.map((plan) => (
            <View key={plan.id} style={[styles.planCard, plan.isBest && styles.bestPlanCard]}>
              {plan.isBest && (
                <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>{t('best_choice')}</Text></View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, plan.isBest && styles.bestPlanIcon]}>{plan.icon({ color: plan.isBest ? '#fff' : '#f59e0b', size: 28 })}</View>
                <View style={styles.planDetails}>
                  <Text style={[styles.planName, plan.isBest && styles.bestPlanText]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, plan.isBest && styles.bestPlanText]}>{plan.priceText}</Text>
                </View>
                {plan.savings && <Text style={[styles.planSavings, plan.isBest && styles.bestPlanSavings]}>-{plan.savings}</Text>}
              </View>
              <Text style={[styles.planDescription, plan.isBest && styles.bestPlanText]}>{plan.description}</Text>
              <View style={styles.buttonGroup}>
                <Pressable style={[styles.payBtn, styles.paystackBtn]} onPress={() => subscribePaystack(plan)} disabled={!!loadingPlan}>
                  {loadingPlan === plan.id ? <ActivityIndicator size="small" color="#fff" /> : (
                    <><CreditCard size={18} color="#fff" /><Text style={styles.payBtnText}>Mobile Money</Text></>
                  )}
                </Pressable>
                {Platform.OS !== 'web' && (
                  <Pressable style={[styles.payBtn, styles.googleBtn]} onPress={() => subscribeStore(plan)} disabled={!!loadingPlan}>
                    <Play size={18} color="#fff" fill="#fff" /><Text style={styles.payBtnText}>{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>{t('comparison_title')}</Text>
          <Text style={styles.comparisonSubtitle}>{t('comparison_subtitle')}</Text>
          <View style={styles.comparisonHeaderRow}>
            <Text style={[styles.comparisonCell, styles.featureHeaderCell]}>{t('service')}</Text>
            <Text style={styles.comparisonPlanHeader}>1M</Text>
            <Text style={styles.comparisonPlanHeader}>3M</Text>
          </View>
          {PLAN_COMPARISON.map((item) => (
            <View key={item.feature} style={styles.comparisonRow}>
              <Text style={[styles.comparisonCell, styles.featureCell]}>{item.feature}</Text>
              <Text style={styles.comparisonValueCell}>{item.availability.MONTHLY}</Text>
              <Text style={styles.comparisonValueCell}>{item.availability.QUARTERLY}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingVertical: 40, gap: 32 },
  hero: { alignItems: 'center', gap: 12 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: 'PlayfairBlack', color: COLORS.ink, textAlign: 'center' },
  subtitle: { textAlign: 'center', fontFamily: 'InterSemiBold', fontSize: 14, color: COLORS.muted },
  benefitsSection: { gap: 20, backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  benefitItem: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  benefitIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  benefitTextWrap: { flex: 1 },
  benefitTitle: { fontSize: 15, fontFamily: 'InterBold', color: COLORS.ink, marginBottom: 4 },
  benefitDesc: { fontSize: 13, fontFamily: 'Inter', color: COLORS.muted, lineHeight: 18 },
  plans: { gap: 20 },
  planCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  bestPlanCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  bestBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  bestBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'InterBold' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  bestPlanIcon: { backgroundColor: 'rgba(255,255,255,0.1)' },
  planDetails: { flex: 1 },
  planName: { fontSize: 18, fontFamily: 'Playfair', color: COLORS.ink },
  planPrice: { fontSize: 14, fontFamily: 'InterSemiBold', color: COLORS.muted },
  planSavings: { backgroundColor: '#dcfce7', color: '#166534', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontFamily: 'InterBold', overflow: 'hidden' },
  bestPlanSavings: { backgroundColor: '#f59e0b', color: '#fff' },
  planDescription: { fontSize: 13, fontFamily: 'Inter', lineHeight: 18 },
  bestPlanText: { color: '#fff' },
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 8 },
  payBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  payBtnText: { color: '#fff', fontFamily: 'InterBold', fontSize: 14 },
  comparisonCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 10 },
  comparisonTitle: { fontSize: 18, fontFamily: 'PlayfairBlack', color: COLORS.ink },
  comparisonSubtitle: { fontSize: 12, fontFamily: 'Inter', color: COLORS.muted },
  comparisonHeaderRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 8 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 8 },
  comparisonCell: { fontSize: 12, fontFamily: 'InterSemiBold', color: '#0f172a' },
  featureHeaderCell: { flex: 1, fontFamily: 'InterBold' },
  featureCell: { flex: 1, fontWeight: '600', paddingRight: 6 },
  comparisonPlanHeader: { width: 38, textAlign: 'center', fontSize: 11, fontFamily: 'InterBold', color: '#334155' },
  comparisonValueCell: { width: 38, textAlign: 'center', fontSize: 11, fontFamily: 'InterSemiBold', color: '#475569' },
});

export default PremiumScreen;
