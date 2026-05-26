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
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';

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

type PlanKey = 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL';
type PlanAvailability = Record<PlanKey, string>;

const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'MONTHLY',
    sku: 'premium_1_month',
    name: '1 Mois',
    priceText: `${PLAN_AMOUNTS.MONTHLY} F CFA`,
    priceAmount: PLAN_AMOUNTS.MONTHLY,
    icon: (props) => <Package {...props} />,
    description: 'Accès premium 1 mois (message direct hors match via achat ponctuel).',
  },
  {
    id: 'QUARTERLY',
    sku: 'premium_3_months',
    name: '3 Mois',
    priceText: `${PLAN_AMOUNTS.QUARTERLY} F CFA`,
    priceAmount: PLAN_AMOUNTS.QUARTERLY,
    savings: '0%',
    icon: (props) => <Gift {...props} />,
    description: 'Mode invisible limité (Homme) + message direct hors match via achat ponctuel.',
  },
  {
    id: 'BIANNUAL',
    sku: 'premium_6_months',
    name: '6 Mois',
    priceText: `${PLAN_AMOUNTS.BIANNUAL} F CFA`,
    priceAmount: PLAN_AMOUNTS.BIANNUAL,
    savings: '17%',
    icon: (props) => <Crown {...props} />,
    description: 'Mode invisible inclus + message direct hors match via achat ponctuel.',
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
    description: 'Mode invisible inclus + message direct hors match via achat ponctuel.',
  },
];

const PLAN_COMPARISON: Array<{ feature: string; availability: PlanAvailability }> = [
  {
    feature: 'Suggestions + Swipe',
    availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui', BIANNUAL: 'Oui', ANNUAL: 'Oui' },
  },
  {
    feature: 'Messages après match',
    availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui', BIANNUAL: 'Oui', ANNUAL: 'Oui' },
  },
  {
    feature: 'Messages directs hors match',
    availability: {
      MONTHLY: 'Achat',
      QUARTERLY: 'Achat',
      BIANNUAL: 'Achat',
      ANNUAL: 'Achat',
    },
  },
  {
    feature: 'Stories (lecture + publication)',
    availability: { MONTHLY: 'Oui', QUARTERLY: 'Oui', BIANNUAL: 'Oui', ANNUAL: 'Oui' },
  },
  {
    feature: 'Mode invisible',
    availability: { MONTHLY: 'Non', QUARTERLY: 'Limité (Homme)', BIANNUAL: 'Oui', ANNUAL: 'Oui' },
  },
  {
    feature: 'Création de communauté',
    availability: { MONTHLY: 'Non', QUARTERLY: 'Non', BIANNUAL: 'Oui', ANNUAL: 'Oui' },
  },
  {
    feature: 'Limites spéciales',
    availability: {
      MONTHLY: 'Aucune',
      QUARTERLY: '20 profils/j + 20 statuts/j + vu masque 2h/j',
      BIANNUAL: 'Aucune',
      ANNUAL: 'Aucune',
    },
  },
];

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshCurrentUser } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [androidOfferTokenBySku, setAndroidOfferTokenBySku] = useState<Record<string, string>>({});

  const loadAndroidSubscriptionOffers = async (): Promise<Record<string, string>> => {
    if (Platform.OS !== 'android') return {};

    const subscriptions: any[] = await IAP.getSubscriptions({
      skus: PREMIUM_PLANS.map((plan) => plan.sku),
    } as any);

    const tokenMap: Record<string, string> = {};
    for (const sub of subscriptions || []) {
      const sku = String(sub?.productId || sub?.sku || '');
      if (!sku) continue;

      const offerDetails: any[] = sub?.subscriptionOfferDetailsAndroid || [];
      if (!Array.isArray(offerDetails) || offerDetails.length === 0) continue;

      const preferredOffer =
        offerDetails.find((offer) => Array.isArray(offer?.offerTags) && offer.offerTags.length === 0) ||
        offerDetails[0];
      const offerToken = String(preferredOffer?.offerToken || '');
      if (offerToken) {
        tokenMap[sku] = offerToken;
      }
    }
    return tokenMap;
  };

  useEffect(() => {
    if (isExpoGo) return;
    const initIAP = async () => {
      try {
        await IAP.initConnection();
        if (Platform.OS === 'android') {
          const offerMap = await loadAndroidSubscriptionOffers();
          setAndroidOfferTokenBySku(offerMap);
        }
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
            type: 'PREMIUM',
            paymentMethod: 'MOBILE_MONEY',
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
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    try {
      let purchasePayload: any = { sku: plan.sku };
      if (Platform.OS === 'android') {
        let offerToken = androidOfferTokenBySku[plan.sku];
        if (!offerToken) {
          const refreshedOffers = await loadAndroidSubscriptionOffers();
          if (Object.keys(refreshedOffers).length > 0) {
            setAndroidOfferTokenBySku((prev) => ({ ...prev, ...refreshedOffers }));
          }
          offerToken = refreshedOffers[plan.sku];
        }

        if (!offerToken) {
          Alert.alert(
            'Erreur Google Play',
            "Aucune offre d'abonnement Google Play trouvée pour ce plan. Vérifiez le base plan et l'offre active."
          );
          return;
        }

        purchasePayload = {
          sku: plan.sku,
          subscriptionOffers: [{ sku: plan.sku, offerToken }],
        };
      }

      const purchase: any = await IAP.requestSubscription(purchasePayload);
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
        await apiRequest(verifyPath, {
          method: 'POST',
          body: JSON.stringify({
            productId: purchaseItem.productId,
            planId: plan.id,
            type: 'PREMIUM',
            purchaseToken: purchaseItem.purchaseToken,
            transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
          }),
          requireAuth: true,
        });
        await IAP.finishTransaction({ purchase: purchaseItem });
        await refreshCurrentUser();
        Alert.alert('Succès', Platform.OS === 'ios' ? 'Ton abonnement App Store est actif.' : 'Ton abonnement Google Play est actif.');
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
                      <Text style={styles.payBtnText}>Mobile Money</Text>
                    </>
                  )}
                </Pressable>

                {Platform.OS !== 'web' && (
                  <Pressable
                    style={[styles.payBtn, styles.googleBtn]}
                    onPress={() => subscribeGooglePlay(plan)}
                    disabled={!!loadingPlan}
                  >
                    <Play size={18} color="#fff" fill="#fff" />
                    <Text style={styles.payBtnText}>
                      {'Carte bancaire'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Comparatif des plans</Text>
          <Text style={styles.comparisonSubtitle}>Services accessibles pour les utilisateurs Premium homme.</Text>

          <View style={styles.comparisonHeaderRow}>
            <Text style={[styles.comparisonCell, styles.featureHeaderCell]}>Service</Text>
            <Text style={styles.comparisonPlanHeader}>1M</Text>
            <Text style={styles.comparisonPlanHeader}>3M</Text>
            <Text style={styles.comparisonPlanHeader}>6M</Text>
            <Text style={styles.comparisonPlanHeader}>1A</Text>
          </View>

          {PLAN_COMPARISON.map((item) => (
            <View key={item.feature} style={styles.comparisonRow}>
              <Text style={[styles.comparisonCell, styles.featureCell]}>{item.feature}</Text>
              <Text style={styles.comparisonValueCell}>{item.availability.MONTHLY}</Text>
              <Text style={styles.comparisonValueCell}>{item.availability.QUARTERLY}</Text>
              <Text style={styles.comparisonValueCell}>{item.availability.BIANNUAL}</Text>
              <Text style={styles.comparisonValueCell}>{item.availability.ANNUAL}</Text>
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
  comparisonCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
  },
  comparisonSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  comparisonCell: {
    fontSize: 12,
    color: '#0f172a',
  },
  featureHeaderCell: {
    flex: 1,
    fontWeight: '800',
  },
  featureCell: {
    flex: 1,
    fontWeight: '600',
    paddingRight: 6,
  },
  comparisonPlanHeader: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
  },
  comparisonValueCell: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
});

export default PremiumScreen;
