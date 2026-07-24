import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, Linking, Image } from 'react-native';
import { ChevronLeft, Eye, EyeOff, CheckSquare, Square } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';
import { getPasswordPolicyHint } from '../../../lib/passwordPolicy';
import { fbAuth } from '../../../lib/firebase';

const WEB_URL = "https://yamo-app-web.vercel.app"; // L'URL de votre déploiement Web final

interface AuthMethodStepProps {
  mode: 'signup' | 'login';
  onBack: () => void;
  onSuccess: (userId: string) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
}

const AuthMethodStep: React.FC<AuthMethodStepProps> = ({ mode, onBack, onSuccess, loading, setLoading }) => {
  const { colors } = useApp();
  const navigation = useNavigation<any>();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);

  const passwordPolicyHint = useMemo(() => getPasswordPolicyHint(), []);

  const handleEmailAction = async () => {
    if (mode === 'signup' && !hasAcceptedLegal) {
      Alert.alert('Consentement requis', "Veuillez accepter les CGU.");
      return;
    }

    setLoading(true);
    try {
      const safeIdentifier = (identifier || '').trim().toLowerCase();
      if (mode === 'signup') {
        const cred = await fbAuth.createUserWithEmailAndPassword(safeIdentifier, password);
        onSuccess(cred.user.uid);
      } else {
        const cred = await fbAuth.signInWithEmailAndPassword(safeIdentifier, password);
        onSuccess(cred.user.uid);
      }
    } catch (error: any) {
      setLoading(false);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Cet email est déjà utilisé.";
      if (error.code === 'auth/invalid-email') msg = "Format d'email invalide.";
      if (error.code === 'auth/weak-password') msg = "Le mot de passe est trop faible.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') msg = "Identifiants incorrects.";
      Alert.alert('Erreur', msg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.topBackButton}>
        <ChevronLeft color={colors.textMuted} size={32} />
      </Pressable>

      <Text style={[styles.title, { color: colors.text }]}>{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</Text>

      <View style={styles.authMethodRow}>
        <Pressable
          onPress={() => setAuthMethod('email')}
          style={[styles.authMethodChip, { borderColor: colors.border }, authMethod === 'email' && styles.authMethodChipActive]}
        >
          <Text style={[styles.authMethodLabel, authMethod === 'email' && styles.authMethodLabelActive]}>Email</Text>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('Bientôt disponible', 'La connexion par téléphone arrive bientôt.')}
          style={[styles.authMethodChip, { borderColor: colors.border }, authMethod === 'phone' && styles.authMethodChipActive]}
        >
          <Text style={[styles.authMethodLabel, authMethod === 'phone' && styles.authMethodLabelActive]}>Téléphone</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="ton@email.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Mot de passe</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          />
          <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.passwordToggle}>
            {isPasswordVisible ? <EyeOff color={colors.textMuted} size={18} /> : <Eye color={colors.textMuted} size={18} />}
          </Pressable>
        </View>
        {mode === 'signup' && <Text style={styles.helperText}>{passwordPolicyHint}</Text>}
      </View>

      {mode === 'login' && (
        <Pressable onPress={() => navigation.navigate('ResetPassword')} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </Pressable>
      )}

      {mode === 'signup' && (
        <View style={styles.checkboxContainer}>
          <Pressable onPress={() => setHasAcceptedLegal(!hasAcceptedLegal)} style={styles.checkboxIcon}>
            {hasAcceptedLegal ? <CheckSquare color={COLORS.primary} size={20} /> : <Square color={colors.textMuted} size={20} />}
          </Pressable>
          <Text style={[styles.checkboxText, { color: colors.text }]}>
            J'accepte les <Text onPress={() => Linking.openURL(`${WEB_URL}/cgu`)} style={styles.legalLink}>CGU</Text> et la <Text onPress={() => Linking.openURL(`${WEB_URL}/privacy`)} style={styles.legalLink}>Politique de confidentialité</Text>
          </Text>
        </View>
      )}

      <PrimaryButton
        label={mode === 'signup' ? 'S\'inscrire' : 'Se connecter'}
        onPress={handleEmailAction}
        loading={loading}
        disabled={loading || !identifier || !password || (mode === 'signup' && !hasAcceptedLegal)}
      />

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>OU</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.socialRow}>
        <Pressable
          onPress={() => Alert.alert('Google Auth', 'La connexion Google nécessite une configuration native. Utilise l\'email pour le moment.')}
          style={[styles.socialButton, { borderColor: colors.border }]}
        >
          <Image source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }} style={{ width: 20, height: 20 }} />
          <Text style={[styles.socialText, { color: colors.text }]}>Google</Text>
        </Pressable>

        <Pressable
          onPress={() => Alert.alert('Apple Auth', 'La connexion Apple arrive bientôt sur mobile.')}
          style={[styles.socialButton, { backgroundColor: '#000', borderColor: '#000' }]}
        >
          <Text style={{ fontSize: 18, color: '#fff' }}></Text>
          <Text style={styles.socialTextApple}>Apple</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 24, gap: 18 },
  topBackButton: { alignSelf: 'flex-start', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '900' },
  authMethodRow: { flexDirection: 'row', gap: 12 },
  authMethodChip: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  authMethodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  authMethodLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  authMethodLabelActive: { color: '#fff' },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderRadius: 16, minHeight: 52, padding: 14, borderWidth: 1, fontSize: 16 },
  passwordInputWrap: { position: 'relative' },
  passwordToggle: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  helperText: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  checkboxIcon: { marginTop: 2 },
  checkboxText: { fontSize: 13, flex: 1, lineHeight: 20 },
  legalLink: { color: COLORS.primary, fontWeight: '800', textDecorationLine: 'underline' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: '900' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  socialText: { fontSize: 13, fontWeight: '700' },
  socialTextApple: { fontSize: 13, fontWeight: '700', color: '#fff' },
});

export default AuthMethodStep;
