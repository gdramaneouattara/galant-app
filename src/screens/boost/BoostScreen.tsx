import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Rocket, Flame, ChevronsUp, Crown, LucideProps } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';

type BoostPlan = {
  id: string;
  name: string;
  price: string;
  savings?: string;
  icon: (props: LucideProps) => React.ReactElement;
  description: string;
  isBest?: boolean;
};

const BOOST_PLANS: BoostPlan[] = [
  {
    id: 'DAILY',
    name: '1 Jour',
    price: '1000 F CFA',
    icon: (props) => <Flame {...props} />,
    description: 'Un coup de pouce pour aujourd\'hui.',
  },
  {
    id: 'THREE_DAYS',
    name: '3 Jours',
    price: '2500 F CFA',
    savings: '17%',
    icon: (props) => <ChevronsUp {...props} />,
    description: 'Le choix le plus populaire.',
    isBest: true,
  },
  {
    id: 'SEVEN_DAYS',
    name: '7 Jours',
    price: '5000 F CFA',
    savings: '29%',
    icon: (props) => <Crown {...props} />,
    description: 'Dominez les résultats pendant une semaine.',
  },
];

const BoostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshCurrentUser } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const boost = async (planId: string) => {
    if (loadingPlan) return;
    setLoadingPlan(planId);

    try {
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/boosts/initialize',
        {
          method: 'POST',
          body: JSON.stringify({ boostId: planId }),
          requireAuth: true,
        }
      );

      const redirectUrl = Linking.createURL('boost');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);

      const verify = await apiRequest<{ status: string; reference: string }>(
        `/api/boosts/verify?reference=${init.reference}`,
        { requireAuth: true }
      );

      if (verify.status === 'active') {
        await refreshCurrentUser();
        Alert.alert('Boost activé', 'Ton profil est maintenant mis en avant.');
        navigation.goBack();
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
            <Rocket color="#fff" size={42} />
          </View>
          <Text style={styles.title}>Passez à la vitesse supérieure</Text>
          <Text style={styles.subtitle}>Votre profil est vu jusqu'à 10x plus. Obtenez plus de matchs !</Text>
        </View>

        <View style={styles.plans}>
          {BOOST_PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                plan.isBest && styles.bestPlanCard,
                loadingPlan === plan.id && styles.planCardDisabled,
              ]}
              onPress={() => boost(plan.id)}
            >
              {plan.isBest && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>MEILLEUR CHOIX</Text>
                </View>
              )}
              <View style={[styles.planIcon, plan.isBest && styles.bestPlanIcon]}>
                {plan.icon({ color: plan.isBest ? '#fff' : COLORS.primary, size: 28 })}
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
    backgroundColor: '#8b5cf6',
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
    backgroundColor: '#f1f5f9',
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

export default BoostScreen;
