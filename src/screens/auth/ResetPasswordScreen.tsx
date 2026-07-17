import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock } from 'lucide-react-native';
import { fbAuth } from '../../lib/firebase';
import { COLORS } from '../../data/mock';
import PrimaryButton from '../../components/PrimaryButton';

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await fbAuth.sendPasswordResetEmail(email.trim().toLowerCase());
      Alert.alert('Email envoyé', 'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}><Lock color={COLORS.primary} size={32} /></View>
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          <Text style={styles.subtitle}>Saisissez votre email pour recevoir un lien de réinitialisation.</Text>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
            <PrimaryButton label={loading ? "Envoi..." : "Envoyer le lien"} onPress={handleReset} disabled={loading || !email} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  form: { width: '100%', gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '800', color: COLORS.ink, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 16, color: COLORS.ink, borderWidth: 1, borderColor: '#e2e8f0' },
});

export default ResetPasswordScreen;
