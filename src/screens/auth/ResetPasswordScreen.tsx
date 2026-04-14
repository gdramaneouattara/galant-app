import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../data/mock';
import PrimaryButton from '../../components/PrimaryButton';
import { getPasswordPolicyHint, validatePasswordPolicy } from '../../lib/passwordPolicy';

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const passwordPolicy = useMemo(() => validatePasswordPolicy(password), [password]);
  const passwordPolicyHint = useMemo(() => getPasswordPolicyHint(), []);

  useEffect(() => {
    let mounted = true;

    const syncSessionState = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setHasRecoverySession(!!data.session?.access_token);
    };

    void syncSessionState();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setHasRecoverySession(!!session?.access_token);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleReset = async () => {
    if (!passwordPolicy.valid) {
      Alert.alert('Erreur', `Le mot de passe doit contenir ${passwordPolicy.reasons.join(', ')}.`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session de reinitialisation invalide. Rouvre le lien email le plus recent.');
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      Alert.alert('Succès', 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.', [
        {
          text: 'OK',
          onPress: () => {
            void supabase.auth.signOut({ scope: 'local' });
            navigation.navigate('AuthFlow' as never);
          },
        }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Lock color={COLORS.primary} size={32} />
          </View>

          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Saisissez votre nouveau mot de passe pour sécuriser votre compte.
          </Text>
          {hasRecoverySession === false ? (
            <Text style={styles.errorHint}>
              Session de recuperation absente. Ouvre le lien de reinitialisation depuis ton email.
            </Text>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 10 caracteres"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.input}
                />
                <Pressable
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.eyeBtn}
                >
                  {isPasswordVisible ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                </Pressable>
              </View>
              <Text style={styles.hintText}>{passwordPolicyHint}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Répétez le mot de passe"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!isPasswordVisible}
                style={styles.input}
              />
            </View>

            <PrimaryButton
              label={loading ? "Mise à jour..." : "Réinitialiser"}
              onPress={handleReset}
              disabled={loading || !password || !confirmPassword || !passwordPolicy.valid || hasRecoverySession === false}
            />
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
  errorHint: { fontSize: 13, color: '#b91c1c', textAlign: 'center', marginBottom: 18, paddingHorizontal: 20, fontWeight: '700' },
  form: { width: '100%', gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '800', color: COLORS.ink, textTransform: 'uppercase' },
  hintText: { fontSize: 12, color: COLORS.muted },
  inputWrapper: { position: 'relative' },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 16, color: COLORS.ink, borderWidth: 1, borderColor: '#e2e8f0' },
  eyeBtn: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }
});

export default ResetPasswordScreen;
