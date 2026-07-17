import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ShieldCheck, Zap, Sparkles, Rocket, BarChart3, Bell, Check, CreditCard } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import * as WebBrowser from 'expo-web-browser';

import { useSubscription } from '../../hooks/useSubscription';

const PartnerPremiumScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors, t, refreshCurrentUser } = useApp();
  const { purchaseLoading, purchaseWithPaystack } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const PLANS = [
    {
      id: 'VISIBILITY',
      title: t('partner_visibility'),
      price: '25 000 F',
      priceAmount: 25000,
      features: [
        t('priority_listing'),
        t('partner_certified_badge'),
        t('itinerary'),
      ],
      color: '#0ea5e9',
      bg: '#f0f9ff'
    },
    {
      id: 'PRESTIGE',
      title: t('partner_prestige'),
      price: '50 000 F',
      priceAmount: 50000,
      features: [
        t('priority_listing'),
        t('partner_certified_badge'),
        t('unlimited_agenda'),
        t('proximity_push'),
        t('partner_stats'),
      ],
      color: '#e11d48',
      bg: '#fff1f2',
      isBest: true
    }
  ];

  const subscribe = async (plan: any) => {
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    const ok = await purchaseWithPaystack('PARTNER_PREMIUM' as any, plan.priceAmount, undefined, { planId: plan.id });
    if (ok) {
      await refreshCurrentUser();
      Alert.alert(t('success'), "Abonnement partenaire activé ! ✨");
      navigation.goBack();
    }
    setLoadingPlan(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.header }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.text} size={28} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('manage_subscription')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Propulsez votre établissement 🚀</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>{t('partner_plan_desc')}</Text>
        </View>

        <View style={styles.plansContainer}>
          {PLANS.map(plan => (
            <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: plan.isBest ? plan.color : colors.border }]}>
              {plan.isBest && (
                <View style={[styles.bestBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.bestBadgeText}>RECOMMANDÉ</Text>
                </View>
              )}
              <Text style={[styles.planTitle, { color: plan.color }]}>{plan.title}</Text>
              <Text style={[styles.planPrice, { color: colors.text }]}>{plan.price}<Text style={styles.planPeriod}> / mois</Text></Text>

              <View style={styles.featuresList}>
                {plan.features.map((feat, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Check size={16} color={plan.color} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{feat}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.payBtn, { backgroundColor: plan.color }]}
                onPress={() => subscribe(plan)}
                disabled={!!loadingPlan}
              >
                {loadingPlan === plan.id ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <CreditCard size={18} color="#fff" />
                    <Text style={styles.payBtnText}>S'abonner</Text>
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlayfairBlack' },
  content: { padding: 20, gap: 32 },
  hero: { alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 24, fontFamily: 'PlayfairBlack', textAlign: 'center' },
  heroSub: { fontSize: 14, fontFamily: 'InterSemiBold', textAlign: 'center', paddingHorizontal: 20 },
  plansContainer: { gap: 24 },
  planCard: { padding: 24, borderRadius: 24, borderWidth: 2, gap: 16 },
  bestBadge: { position: 'absolute', top: -12, right: 24, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  bestBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'InterBold' },
  planTitle: { fontSize: 18, fontFamily: 'InterBold' },
  planPrice: { fontSize: 32, fontFamily: 'PlayfairBlack' },
  planPeriod: { fontSize: 14, fontFamily: 'InterSemiBold', opacity: 0.6 },
  featuresList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontFamily: 'InterSemiBold' },
  payBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  payBtnText: { color: '#fff', fontSize: 16, fontFamily: 'InterBold' },
});

export default PartnerPremiumScreen;
