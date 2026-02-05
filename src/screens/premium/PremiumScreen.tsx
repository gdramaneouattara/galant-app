import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS, SUBSCRIPTION_PLANS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';

// Helper to simulate a delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshCurrentUser, updateCurrentUser } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const subscribe = async (planId: string) => {
    if (loadingPlan) return;
    setLoadingPlan(planId);

    // --- SIMULATION LOGIC ---
    if (process.env.EXPO_PUBLIC_SIMULATE_PAYMENT === 'true') {
      try {
        await wait(2000); // Simulate network delay
        updateCurrentUser({ isPremium: true }); // Directly update the user state
        Alert.alert('Premium activé (Simulation)', 'Ton abonnement est maintenant actif.');
        navigation.goBack();
      } catch (error: any) {
        Alert.alert('Erreur de simulation', error?.message);
      } finally {
        setLoadingPlan(null);
      }
      return;
    }
    // --- END SIMULATION LOGIC ---

    try {
      const init = await apiRequest<{ authorization_url: string; reference: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          body: JSON.stringify({ planId }),
          requireAuth: true,
        }
      );

      const redirectUrl = Linking.createURL('paystack');
      await WebBrowser.openAuthSessionAsync(init.authorization_url, redirectUrl);

      const verify = await apiRequest<{ status: string; reference: string }>(
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
          <View style={styles.iconWrap}>
            <Crown color="#fff" size={42} />
          </View>
          <Text style={styles.title}>YAMO PREMIUM</Text>
          <Text style={styles.subtitle}>Débloque les messages et les filtres avancés.</Text>
        </View>

        <View style={styles.plans}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              style={[styles.planCard, loadingPlan === plan.id && styles.planCardDisabled]}
              onPress={() => subscribe(plan.id)}
            >
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
              {plan.savings && <Text style={styles.planSavings}>-{plan.savings}</Text>}
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
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.muted,
  },
  plans: {
    gap: 12,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  planPrice: {
    color: COLORS.muted,
    marginTop: 4,
  },
  planSavings: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  planLoading: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 12,
  },
});

export default PremiumScreen;
