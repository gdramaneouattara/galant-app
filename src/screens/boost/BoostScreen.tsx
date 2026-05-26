import React, { useState, useEffect } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { Rocket, Flame, ChevronsUp, Crown, LucideProps, CreditCard, Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as IAP from 'react-native-iap';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { IAP_EXPO_GO_MESSAGE, isExpoGo } from '../../lib/iapRuntime';

const BOOST_PRICES = {
  '1D': parseInt(process.env.EXPO_PUBLIC_BOOST_1D_AMOUNT || '1000'),
  '3D': parseInt(process.env.EXPO_PUBLIC_BOOST_3D_AMOUNT || '2500'),
  '7D': parseInt(process.env.EXPO_PUBLIC_BOOST_7D_AMOUNT || '5000'),
};

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

const BOOST_PLANS: BoostPlan[] = [
  {
    id: '1D',
    sku: 'boost_1_day',
    name: '1 Jour',
    priceText: `${BOOST_PRICES['1D']} F CFA`,
    priceAmount: BOOST_PRICES['1D'],
    icon: (props) => <Flame {...props} />,
    description: 'Un coup de pouce pour aujourd\'hui.',
  },
  {
    id: '3D',
    sku: 'boost_3_days',
    name: '3 Jours',
    priceText: `${BOOST_PRICES['3D']} F CFA`,
    priceAmount: BOOST_PRICES['3D'],
    savings: '17%',
    icon: (props) => <ChevronsUp {...props} />,
    description: 'Le choix le plus populaire.',
    isBest: true,
  },
  {
    id: '7D',
    sku: 'boost_7_days',
    name: '7 Jours',
    priceText: `${BOOST_PRICES['7D']} F CFA`,
    priceAmount: BOOST_PRICES['7D'],
    savings: '29%',
    icon: (props) => <Crown {...props} />,
    description: 'Dominez les résultats pendant une semaine.',
  },
];

const BoostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, refreshCurrentUser, activateBoost } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activatingFree, setActivatingFree] = useState(false);

  const isMaleTrialActive = (() => {
    if (!currentUser) return false;
    if (String(currentUser.gender || '').toUpperCase() !== 'MALE') return false;
    if (currentUser.isPremium) return false;
    if (!currentUser.trial_started_at) return false;
    const startedAt = new Date(currentUser.trial_started_at).getTime();
    if (!Number.isFinite(startedAt)) return false;
    const trialEndsAt = startedAt + 7 * 24 * 60 * 60 * 1000;
    return Date.now() < trialEndsAt;
  })();

  const canSeeFreeBoostCard =
    (String(currentUser?.gender || '').toUpperCase() === 'FEMALE' && !!currentUser?.isPremium) ||
    isMaleTrialActive;

  useEffect(() => {
    if (isExpoGo) return;
    IAP.initConnection().catch(() => {});
    return () => { IAP.endConnection().catch(() => {}); };
  }, []);

  const handleFreeBoost = async () => {
    try {
      setActivatingFree(true);
      const result = await activateBoost();
      if (result) {
        Alert.alert('Succès', 'Votre boost d\'une heure est activé !');
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'activer le boost gratuit.');
    } finally {
      setActivatingFree(false);
    }
  };

  const boostPaystack = async (plan: BoostPlan) => {
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
            type: 'BOOST',
            paymentMethod: 'MOBILE_MONEY',
          }),
          requireAuth: true,
        }
      );

      const redirectUrl = Linking.createURL('boost');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);

      const verify = await apiRequest<{ status: string }>(
        `/api/payments/verify?reference=${init.reference}`,
        { requireAuth: true }
      );

      if (verify.status === 'active') {
        await refreshCurrentUser();
        Alert.alert('Succès', 'Boost activé.');
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

  const boostGooglePlay = async (plan: BoostPlan) => {
    if (isExpoGo) {
      Alert.alert('Achat indisponible', IAP_EXPO_GO_MESSAGE);
      return;
    }
    if (loadingPlan) return;
    setLoadingPlan(plan.id);
    try {
      const purchasePayload = Platform.select({
        ios: { sku: plan.sku },
        android: { skus: [plan.sku] },
      }) as any;
      const purchase: any = await IAP.requestPurchase(purchasePayload);
      const purchaseItem = Array.isArray(purchase) ? purchase[0] : purchase;
      if (purchaseItem) {
        const verifyPath = Platform.OS === 'ios' ? '/api/payments/apple-verify' : '/api/payments/google-verify';
        await apiRequest(verifyPath, {
          method: 'POST',
          body: JSON.stringify({
            productId: purchaseItem.productId,
            type: 'BOOST',
            planId: plan.id,
            purchaseToken: purchaseItem.purchaseToken,
            transactionId: purchaseItem.transactionId || purchaseItem.originalTransactionIdentifierIOS,
          }),
          requireAuth: true,
        });
        await IAP.finishTransaction({ purchase: purchaseItem, isConsumable: true });
        await refreshCurrentUser();
        Alert.alert('Succès', Platform.OS === 'ios' ? 'Boost activé avec App Store.' : 'Boost activé avec Google Play.');
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
            <Rocket color="#fff" size={42} />
          </View>
          <Text style={styles.title}>Boostez votre profil</Text>
          <Text style={styles.subtitle}>Soyez vu par plus de monde et obtenez plus de matchs !</Text>
        </View>

        {/* Free Boost Block */}
        {canSeeFreeBoostCard && (
          <Pressable
            style={[styles.freeBoostCard, activatingFree && { opacity: 0.7 }]}
            onPress={handleFreeBoost}
            disabled={activatingFree}
          >
            <View style={styles.freeBoostIcon}>
              <Flame color="#fff" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.freeBoostTitle}>Boost gratuit disponible</Text>
              <Text style={styles.freeBoostSub}>Utilisez votre heure de visibilité offerte.</Text>
            </View>
            {activatingFree ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <View style={styles.freeBoostBtn}>
                <Text style={styles.freeBoostBtnText}>Activer</Text>
              </View>
            )}
          </Pressable>
        )}

        <View style={styles.plans}>
          {BOOST_PLANS.map((plan) => (
            <View key={plan.id} style={[styles.planCard, plan.isBest && styles.bestPlanCard]}>
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, plan.isBest && styles.bestPlanIcon]}>
                  {plan.icon({ color: plan.isBest ? '#fff' : COLORS.primary, size: 28 })}
                </View>
                <View style={styles.planDetails}>
                  <Text style={[styles.planName, plan.isBest && styles.bestPlanText]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, plan.isBest && styles.bestPlanText]}>{plan.priceText}</Text>
                </View>
              </View>

              <Text style={[styles.planDescription, plan.isBest && styles.bestPlanText]}>{plan.description}</Text>

              <View style={styles.buttonGroup}>
                <Pressable
                  style={[styles.payBtn, styles.paystackBtn]}
                  onPress={() => boostPaystack(plan)}
                  disabled={!!loadingPlan}
                >
                  <CreditCard size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Mobile Money</Text>
                </Pressable>

                {Platform.OS !== 'web' && (
                  <Pressable
                    style={[styles.payBtn, styles.googleBtn]}
                    onPress={() => boostGooglePlay(plan)}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingVertical: 40, gap: 32 },
  hero: { alignItems: 'center', gap: 12 },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.ink, textAlign: 'center' },
  subtitle: { color: COLORS.muted, textAlign: 'center', fontSize: 15 },
  freeBoostCard: { backgroundColor: '#fff', borderWidth: 2, borderColor: COLORS.primary, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  freeBoostIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  freeBoostTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  freeBoostSub: { fontSize: 12, color: COLORS.muted },
  freeBoostBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fef2f2' },
  freeBoostBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  plans: { gap: 20 },
  planCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  bestPlanCard: { backgroundColor: '#4c1d95', borderColor: '#5b21b6' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  bestPlanIcon: { backgroundColor: 'rgba(255,255,255,0.1)' },
  planDetails: { flex: 1 },
  planName: { fontSize: 18, fontWeight: 'bold', color: COLORS.ink },
  planPrice: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  planDescription: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  bestPlanText: { color: '#fff' },
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 8 },
  payBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  paystackBtn: { backgroundColor: '#09a5db' },
  googleBtn: { backgroundColor: '#000' },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default BoostScreen;
