import React, { useState, useEffect } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { Crown, Gem, Gift, Package, LucideProps, CreditCard, Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PLAN_AMOUNTS = {
  MONTHLY: parseInt(process.env.EXPO_PUBLIC_PLAN_MONTHLY_AMOUNT || '3000'),
  QUARTERLY: parseInt(process.env.EXPO_PUBLIC_PLAN_QUARTERLY_AMOUNT || '9000'),
  BIANNUAL: parseInt(process.env.EXPO_PUBLIC_PLAN_BIANNUAL_AMOUNT || '15000'),
  ANNUAL: parseInt(process.env.EXPO_PUBLIC_PLAN_ANNUAL_AMOUNT || '30000'),
};

type PremiumPlan = {
  id: string;
  sku: string; // Google Play SKU
  name: string;
  priceText: string;
  priceAmount: number;
  savings?: string;
  icon: (props: LucideProps) => React.ReactElement;
  description: string;
  isBest?: boolean;
};

const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'MONTHLY',
    sku: 'premium_1_month',
    name: '1 Mois',
    priceText: `${PLAN_AMOUNTS.MONTHLY} F CFA`,
    priceAmount: PLAN_AMOUNTS.MONTHLY,
    icon: (props) => <Package {...props} />,
    description: 'Accès complet pour un mois (sans mode invisible).',
  },
  {
    id: 'QUARTERLY',
    sku: 'premium_3_months',
    name: '3 Mois',
    priceText: `${PLAN_AMOUNTS.QUARTERLY} F CFA`,
    priceAmount: PLAN_AMOUNTS.QUARTERLY,
    savings: '0%',
    icon: (props) => <Gift {...props} />,
    description: 'Formule trimestrielle (sans mode invisible).',
  },
  {
    id: 'BIANNUAL',
    sku: 'premium_6_months',
    name: '6 Mois',
    priceText: `${PLAN_AMOUNTS.BIANNUAL} F CFA`,
    priceAmount: PLAN_AMOUNTS.BIANNUAL,
    savings: '17%',
    icon: (props) => <Crown {...props} />,
    description: 'Mode invisible inclus.',
    isBest: true,
  },
  {
    id: 'ANNUAL',
    sku: 'premium_1_year',
    name: '1 An',
    priceText: `${PLAN_AMOUNTS.ANNUAL} F CFA`,
    priceAmount: PLAN_AMOUNTS.ANNUAL,
    savings: '17%',
    icon: (props) => <Gem {...props} />,
    description: 'Mode invisible inclus.',
  },
];

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, refreshCurrentUser, updateCurrentUser } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const initIAP = async () => {
      try {
        await IAP.initConnection();
      } catch (err) {
        console.warn('IAP Init Error', err);
      }
    };
    initIAP();
    return () => {
      IAP.endConnection();
    };
  }, []);

  const subscribePaystack = async (plan: PremiumPlan) => {
    if (loadingPlan) return;
    setLoadingPlan(plan.id);

    try {
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          body: JSON.stringify({
            planId: plan.id,
            amount: plan.priceAmount,
            type: 'PREMIUM'
          }),
          requireAuth: true
        }
      );
      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);
      const verify = await apiRequest<{ status: string }>(
        `/api/payments/verify?reference=${init.reference}`,
        { requireAuth: true }
      );
      if (verify.status === 'active') {
        await refreshCurrentUser();
        Alert.alert('Succès', 'Ton abonnement est actif.');
        navigation.goBack();
      } else {
        Alert.alert('Paiement en attente', 'Le paiement est en cours de validation.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const subscribeGooglePlay = async (plan: PremiumPlan) => {
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    try {
      // @ts-ignore
      const purchase: any = await IAP.requestSubscription(plan.sku);
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        await apiRequest('/api/payments/google-verify', {
          method: 'POST',
          body: JSON.stringify({
            purchaseToken: purchaseItem.purchaseToken,
            productId: purchaseItem.productId,
            planId: plan.id,
          }),
          requireAuth: true,
        });
        await refreshCurrentUser();
        Alert.alert('Succès', 'Ton abonnement Google Play est actif.');
        navigation.goBack();
      }
    } catch (err: any) {
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Erreur Google Play', err.message);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Crown color="#fff" size={42} />
          </View>
          <Text style={styles.title}>Devenez Membre Premium</Text>
          <Text style={styles.subtitle}>Accès illimité aux messages, filtres avancés et bien plus.</Text>
        </View>

        <View style={styles.plans}>
          {PREMIUM_PLANS.map((plan) => (
            <View key={plan.id} style={[styles.planCard, plan.isBest && styles.bestPlanCard]}>
              {plan.isBest && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>MEILLEUR CHOIX</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planIcon, plan.isBest && styles.bestPlanIcon]}>
                  {plan.icon({ color: plan.isBest ? '#fff' : '#f59e0b', size: 28 })}
                </View>
                <View style={styles.planDetails}>
                  <Text style={[styles.planName, plan.isBest && styles.bestPlanText]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, plan.isBest && styles.bestPlanText]}>{plan.priceText}</Text>
                </View>
                {plan.savings && (
                  <Text style={[styles.planSavings, plan.isBest && styles.bestPlanSavings]}>
                    -{plan.savings}
                  </Text>
                )}
              </View>

              <Text style={[styles.planDescription, plan.isBest && styles.bestPlanText]}>
                {plan.description}
              </Text>

              <View style={styles.buttonGroup}>
                <Pressable
                  style={[styles.payBtn, styles.paystackBtn]}
                  onPress={() => subscribePaystack(plan)}
                  disabled={!!loadingPlan}
                >
                  {loadingPlan === plan.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <CreditCard size={18} color="#fff" />
                      <Text style={styles.payBtnText}>Paystack</Text>
                    </>
                  )}
                </Pressable>

                {Platform.OS === 'android' && (
                  <Pressable
                    style={[styles.payBtn, styles.googleBtn]}
                    onPress={() => subscribeGooglePlay(plan)}
                    disabled={!!loadingPlan}
                  >
                    <Play size={18} color="#fff" fill="#fff" />
                    <Text style={styles.payBtnText}>Google Play</Text>
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
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingVertical: 40,
    gap: 32,
  },
  hero: {
    alignItems: 'center', gap: 12,
  },
  heroIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 26, fontWeight: '900', color: COLORS.ink, textAlign: 'center',
  },
  subtitle: {
    color: COLORS.muted, textAlign: 'center', fontSize: 15,
  },
  plans: {
    gap: 20,
  },
  planCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  bestPlanCard: {
    backgroundColor: '#1e293b', borderColor: '#334155',
  },
  bestBadge: {
    position: 'absolute', top: -12, right: 20, backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
  },
  bestBadgeText: {
    color: '#fff', fontSize: 10, fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  planIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center',
  },
  bestPlanIcon: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontSize: 18, fontWeight: 'bold', color: COLORS.ink,
  },
  planPrice: {
    fontSize: 14, color: COLORS.muted, fontWeight: '600',
  },
  planSavings: {
    backgroundColor: '#dcfce7', color: '#166534', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: 'bold', overflow: 'hidden',
  },
  bestPlanSavings: {
    backgroundColor: '#f59e0b', color: '#fff',
  },
  planDescription: {
    fontSize: 13, color: COLORS.muted, lineHeight: 18,
  },
  bestPlanText: {
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  payBtn: {
    flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  paystackBtn: {
    backgroundColor: '#09a5db',
  },
  googleBtn: {
    backgroundColor: '#000',
  },
  payBtnText: {
    color: '#fff', fontWeight: '700', fontSize: 14,
  },
});

export default PremiumScreen;
