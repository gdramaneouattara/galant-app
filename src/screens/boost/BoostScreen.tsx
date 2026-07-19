import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { Rocket, Flame, ChevronsUp, Crown, LucideProps, CreditCard, Play } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';
import { getBoostActiveMessage, getBoostStatus } from '../../lib/boostStatus';

import { useSubscription } from '../../hooks/useSubscription';

type BoostPlan = {
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

const BoostScreen: React.FC = () => {
  // Quality requirements: /api/payments/initialize, /api/payments/verify
  const navigation = useNavigation();
  const { currentUser, refreshCurrentUser, activateBoost, appResumeVersion, t } = useApp();
  const { purchaseLoading, purchaseWithPaystack, purchaseWithStore, initIAP, endIAP } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activatingFree, setActivatingFree] = useState(false);
  const boostStatus = getBoostStatus(currentUser?.boosted_until);

  const BOOST_PLANS: BoostPlan[] = useMemo(() => [
    {
      id: '1D',
      sku: process.env.EXPO_PUBLIC_BOOST_1D_SKU || 'boost_1_day',
      name: t('one_day'),
      priceText: `1 000 F CFA`,
      priceAmount: 1000,
      icon: (props) => <Flame {...props} />,
      description: t('boost_1d_desc'),
    },
    {
      id: '3D',
      sku: process.env.EXPO_PUBLIC_BOOST_3D_SKU || 'boost_3_days',
      name: t('three_days'),
      priceText: `2 500 F CFA`,
      priceAmount: 2500,
      savings: '17%',
      icon: (props) => <ChevronsUp {...props} />,
      description: t('boost_3d_desc'),
      isBest: true,
    },
    {
      id: '7D',
      sku: process.env.EXPO_PUBLIC_BOOST_7D_SKU || 'boost_7_days',
      name: t('seven_days'),
      priceText: `5 000 F CFA`,
      priceAmount: 5000,
      savings: '29%',
      icon: (props) => <Crown {...props} />,
      description: t('boost_7d_desc'),
    },
  ], [t]);

  const isMaleTrialActive = useMemo(() => {
    if (!currentUser) return false;
    if (String(currentUser.gender || '').toUpperCase() !== 'MALE') return false;
    if (currentUser.is_premium) return false;
    if (!currentUser.trial_started_at) return false;
    const startedAt = new Date(currentUser.trial_started_at).getTime();
    return Number.isFinite(startedAt) && (Date.now() < startedAt + 7 * 24 * 60 * 60 * 1000);
  }, [currentUser]);

  const canSeeFreeBoostCard = (String(currentUser?.gender || '').toUpperCase() === 'FEMALE' && !!currentUser?.is_premium) || isMaleTrialActive;

  useEffect(() => {
    void initIAP(BOOST_PLANS.map(p => p.sku));
    return () => { void endIAP(); };
  }, [BOOST_PLANS]);

  useFocusEffect(useCallback(() => { void refreshCurrentUser(); }, [refreshCurrentUser, appResumeVersion]));

  const showActiveBoostMessage = () => {
    const boostMessage = getBoostActiveMessage(currentUser?.boosted_until);
    if (!boostMessage) return false;
    Alert.alert(t('active'), boostMessage);
    return true;
  };

  const handleFreeBoost = async () => {
    if (showActiveBoostMessage()) return;
    try {
      setActivatingFree(true);
      const result = await activateBoost();
      if (result) {
        Alert.alert(t('success'), t('free_boost_success'));
        navigation.goBack();
      }
    } catch {
      Alert.alert(t('error'), "...");
    } finally {
      setActivatingFree(false);
    }
  };

  const handleBoostPaystack = async (plan: BoostPlan) => {
    if (showActiveBoostMessage()) return;
    setLoadingPlan(plan.id);
    const ok = await purchaseWithPaystack('BOOST', plan.priceAmount, undefined, { planId: plan.id });
    if (ok) {
      await refreshCurrentUser();
      Alert.alert(t('success'), t('boost_activated'));
      navigation.goBack();
    }
    setLoadingPlan(null);
  };

  const handleBoostStore = async (plan: BoostPlan) => {
    if (showActiveBoostMessage()) return;
    setLoadingPlan(plan.id);
    const ok = await purchaseWithStore(plan.sku, 'BOOST', undefined, false);
    if (ok) {
      await refreshCurrentUser();
      Alert.alert(t('success'), t('boost_activated'));
      navigation.goBack();
    }
    setLoadingPlan(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}><Rocket color="#fff" size={42} /></View>
          <Text style={styles.title}>{t('boost_your_profile')}</Text>
          <Text style={styles.subtitle}>{t('boost_subtitle')}</Text>
        </View>

        {boostStatus.active ? (
          <Pressable style={styles.activeBoostCard} onPress={showActiveBoostMessage}>
            <View style={styles.activeBoostIcon}><Rocket color="#fff" size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeBoostTitle}>{t('already_boosted')}</Text>
              <Text style={styles.activeBoostSub}>{t('remaining')}: {boostStatus.remainingLabel}</Text>
            </View>
          </Pressable>
        ) : null}

        {canSeeFreeBoostCard && (
          <Pressable style={[styles.freeBoostCard, activatingFree && { opacity: 0.7 }]} onPress={handleFreeBoost} disabled={activatingFree}>
            <View style={styles.freeBoostIcon}><Flame color="#fff" size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.freeBoostTitle}>{t('free_boost_available')}</Text>
              <Text style={styles.freeBoostSub}>{t('free_boost_subtitle')}</Text>
            </View>
            {activatingFree ? <ActivityIndicator color={COLORS.primary} size="small" /> : (
              <View style={styles.freeBoostBtn}><Text style={styles.freeBoostBtnText}>{t('activate')}</Text></View>
            )}
          </Pressable>
        )}

        <View style={styles.plans}>
          {BOOST_PLANS.map((plan) => (
            <View key={plan.id} style={[styles.planCard, plan.isBest && styles.bestPlanCard]}>
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, plan.isBest && styles.bestPlanIcon]}>{plan.icon({ color: plan.isBest ? '#fff' : COLORS.primary, size: 28 })}</View>
                <View style={styles.planDetails}>
                  <Text style={[styles.planName, plan.isBest && styles.bestPlanText]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, plan.isBest && styles.bestPlanText]}>{plan.priceText}</Text>
                </View>
              </View>
              <Text style={[styles.planDescription, plan.isBest && styles.bestPlanText]}>{plan.description}</Text>
              <View style={styles.buttonGroup}>
                <Pressable style={[styles.payBtn, styles.paystackBtn]} onPress={() => handleBoostPaystack(plan)} disabled={!!loadingPlan}>
                   <CreditCard size={18} color="#fff" /><Text style={styles.payBtnText}>Mobile Money</Text>
                </Pressable>
                {Platform.OS !== 'web' && (
                  <Pressable style={[styles.payBtn, styles.googleBtn]} onPress={() => handleBoostStore(plan)} disabled={!!loadingPlan}>
                    <Play size={18} color="#fff" fill="#fff" /><Text style={styles.payBtnText}>{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}</Text>
                  </Pressable>
                )}
              </View>
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
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 15 },
  activeBoostCard: { backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeBoostIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  activeBoostTitle: { fontSize: 16, fontWeight: '900', color: '#4c1d95' },
  activeBoostSub: { marginTop: 2, fontSize: 12, color: '#6d28d9', lineHeight: 17 },
  freeBoostCard: { backgroundColor: '#fff', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  freeBoostIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  freeBoostTitle: { fontSize: 16, fontWeight: '800' },
  freeBoostSub: { fontSize: 12 },
  freeBoostBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fef2f2' },
  freeBoostBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  plans: { gap: 20 },
  planCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  bestPlanCard: { backgroundColor: '#4c1d95', borderColor: '#5b21b6' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  bestPlanIcon: { backgroundColor: 'rgba(255,255,255,0.1)' },
  planDetails: { flex: 1 },
  planName: { fontSize: 18, fontWeight: 'bold' },
  planPrice: { fontSize: 14, fontWeight: '600' },
  planDescription: { fontSize: 13, lineHeight: 18 },
  bestPlanText: { color: '#fff' },
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 8 },
  payBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default BoostScreen;
