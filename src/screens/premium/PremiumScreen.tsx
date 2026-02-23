import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Crown, Gem, Gift, Package } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PREMIUM_PLANS = [
  {
    id: 'MONTHLY',
    name: '1 Mois',
    price: '3000 F CFA',
    icon: (props) => <Package {...props} />,
    description: 'Accès complet pour un mois.',
  },
  {
    id: 'QUARTERLY',
    name: '3 Mois',
    price: '7500 F CFA',
    savings: '17%',
    icon: (props) => <Gift {...props} />,
    description: 'Le plus populaire.',
    isBest: true,
  },
  {
    id: 'ANNUAL',
    name: '1 An',
    price: '25000 F CFA',
    savings: '30%',
    icon: (props) => <Gem {...props} />,
    description: 'Le meilleur rapport qualité-prix.',
  },
];

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshCurrentUser, updateCurrentUser } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const subscribe = async (planId: string) => {
    if (loadingPlan) return;
    setLoadingPlan(planId);

    if (process.env.EXPO_PUBLIC_SIMULATE_PAYMENT === 'true') {
      try {
        await wait(2000);
        updateCurrentUser({ isPremium: true });
        Alert.alert('Premium activé (Simulation)', 'Ton abonnement est maintenant actif.');
        navigation.goBack();
      } catch (error: any) {
        Alert.alert('Erreur de simulation', error?.message);
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    try {
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        { method: 'POST', body: JSON.stringify({ planId }), requireAuth: true }
      );
      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);
      const verify = await apiRequest<{ status: string }>(
        `/api/payments/verify?reference=${init.reference}`,
        { requireAuth: true }
      );
      if (verify.status === 'active') {
        const updated = await refreshCurrentUser();
        if (updated?.isPremium) {
          Alert.alert('Premium activé', 'Ton abonnement est actif.');
          navigation.goBack();
        } else {
          Alert.alert('Paiement en attente', 'Le paiement est en cours de validation.');
        }
      } else {
        Alert.alert('Paiement en attente', 'Le paiement est en cours de validation.');
      }
    } catch (error: any) {
      Alert.alert('Erreur paiement', error?.message || 'Impossible de démarrer le paiement.');
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
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                plan.isBest && styles.bestPlanCard,
                loadingPlan === plan.id && styles.planCardDisabled,
              ]}
              onPress={() => subscribe(plan.id)}
            >
              {plan.isBest && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>MEILLEUR CHOIX</Text>
                </View>
              )}
              <View style={[styles.planIcon, plan.isBest && styles.bestPlanIcon]}>
                {plan.icon({ color: plan.isBest ? '#fff' : '#f59e0b', size: 28 })}
              </View>
              <View style={styles.planDetails}>
                <Text style={[styles.planName, plan.isBest && styles.bestPlanText]}>{plan.name}</Text>
                <Text style={[styles.planDescription, plan.isBest && styles.bestPlanText]}>
                  {plan.description}
                </Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={[styles.planPrice, plan.isBest && styles.bestPlanText]}>{plan.price}</Text>
                {plan.savings && (
                  <Text style={[styles.planSavings, plan.isBest && styles.bestPlanSavings]}>
                    Économisez {plan.savings}
                  </Text>
                )}
              </View>
              {loadingPlan === plan.id && <Text style={styles.planLoading}>Traitement…</Text>}
            </Pressable>
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
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 16,
  },
  plans: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  bestPlanCard: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  bestBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bestBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
  },
  bestPlanIcon: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  planDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.ink,
  },
  planSavings: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 11,
  },
  bestPlanText: {
    color: '#fff',
  },
  bestPlanSavings: {
    color: '#fde047',
  },
  planLoading: {
    position: 'absolute',
    right: 20,
    bottom: 10,
    color: COLORS.muted,
    fontSize: 12,
  },
});

export default PremiumScreen;
