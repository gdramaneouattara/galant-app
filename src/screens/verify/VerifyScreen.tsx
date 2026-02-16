import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';

const VerifyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, refreshCurrentUser } = useApp();
  const [loading, setLoading] = useState(false);

  if (!currentUser) return null;

  if (currentUser.isVerified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.icon}>
            <ShieldCheck color="#16a34a" size={52} />
          </View>
          <Text style={styles.title}>Identité vérifiée</Text>
          <Text style={styles.subtitle}>Votre profil est déjà vérifié.</Text>
          <Pressable style={styles.primary} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryLabel}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const startVerification = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const init = await apiRequest<{ verification_url: string }>('/api/kyc/initialize', {
        method: 'POST',
        requireAuth: true,
      });

      const redirectUrl = Linking.createURL('kyc');
      await WebBrowser.openAuthSessionAsync(init.verification_url, redirectUrl);
      const updated = await refreshCurrentUser();

      if (updated?.isVerified) {
        Alert.alert('Vérifié', 'Votre identité a été confirmée.');
        navigation.goBack();
      } else {
        Alert.alert('En cours', 'La vérification est en cours. Nous te notifierons dès validation.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de démarrer la vérification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.icon}>
          <ShieldCheck color="#2563eb" size={52} />
        </View>
        <Text style={styles.title}>Vérifiez-vous</Text>
        <Text style={styles.subtitle}>Confirmez votre identité via notre partenaire.</Text>
        <Pressable style={styles.primary} onPress={startVerification}>
          <Text style={styles.primaryLabel}>{loading ? 'Ouverture…' : 'Commencer'}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.later}>Plus tard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  primary: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 10,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  later: {
    color: '#94a3b8',
    fontWeight: '700',
  },
});

export default VerifyScreen;
