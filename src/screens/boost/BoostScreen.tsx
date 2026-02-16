import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Rocket } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';

const BOOST_PLANS = [
  { id: 'DAILY', name: '1 Jour', price: '1000 F CFA' },
  { id: 'THREE_DAYS', name: '3 Jours', price: '2500 F CFA', savings: '17%' },
  { id: 'SEVEN_DAYS', name: '7 Jours', price: '5000 F CFA', savings: '29%' },
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
          <View style={styles.iconWrap}>
            <Rocket color="#fff" size={42} />
          </View>
          <Text style={styles.title}>BOOSTER PROFIL</Text>
          <Text style={styles.subtitle}>Mets ton profil en avant pour plus de matchs.</Text>
        </View>

        <View style={styles.plans}>
          {BOOST_PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              style={[styles.planCard, loadingPlan === plan.id && styles.planCardDisabled]}
              onPress={() => boost(plan.id)}
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
    backgroundColor: '#8b5cf6',
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
    color: '#8b5cf6',
    fontWeight: '700',
  },
  planLoading: {
    color: COLORS.muted,
    fontSize: 12,
    marginLeft: 12,
  },
});

export default BoostScreen;
