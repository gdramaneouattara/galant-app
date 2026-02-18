
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Camera, CheckSquare, ChevronLeft, Eye, EyeOff, MapPin, Square } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { Gender } from '../../types';
import { useApp } from '../../state/AppContext';
import PrimaryButton from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { logEvent, logError } from '../../lib/analytics';

const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL ||
  'https://raw.githubusercontent.com/gdramaneouattara/yamo/main/docs/legal/conditions-utilisation-yamo.md';
const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ||
  'https://raw.githubusercontent.com/gdramaneouattara/yamo/main/docs/legal/politique-confidentialite-yamo.md';

const INTERESTS_OPTIONS = [
  'Voyage',
  'Musique',
  'Cuisine',
  'Sport',
  'Art',
  'Cinéma',
  'Lecture',
  'Gaming',
  'Danse',
  'Tech',
  'Nature',
  'Mode',
  'Photos',
  'Yoga',
  'Sorties',
];

type Step = 'welcome' | 'signup' | 'login' | 'identity' | 'photos' | 'bio' | 'preferences' | 'location';

const AuthFlowScreen: React.FC = () => {
  const { login } = useApp();
  const [step, setStep] = useState<Step>('welcome');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: Gender.FEMALE,
    photos: [] as string[],
    bio: '',
    interests: [] as string[],
    targetGender: [Gender.MALE] as Gender[],
    city: 'Douala',
  });

  const profileSteps: Step[] = ['identity', 'photos', 'bio', 'preferences', 'location'];
  const progress = useMemo(() => {
    const index = Math.max(0, profileSteps.indexOf(step));
    return Math.round((index / (profileSteps.length - 1)) * 100);
  }, [step, profileSteps]);

  const goTo = (targetStep: Step) => setStep(targetStep);
  const nextStep = () => {
    const idx = profileSteps.indexOf(step);
    if (idx < profileSteps.length - 1) goTo(profileSteps[idx + 1]);
  };
  const prevStep = () => {
    if (step === 'identity') {
      goTo('welcome');
      return;
    }
    const idx = profileSteps.indexOf(step);
    if (idx > 0) goTo(profileSteps[idx - 1]);
  };

  const openLegalDocument = async (url: string, docType: 'cgu' | 'privacy') => {
    try {
      await WebBrowser.openBrowserAsync(url);
      logEvent('ui', 'legal_document_opened', { docType });
    } catch (error) {
      logError(error, { action: 'open_legal_document', docType });
      Alert.alert('Erreur', "Impossible d'ouvrir ce document pour le moment.");
    }
  };

  async function handleSignUp() {
    if (!hasAcceptedLegal) {
      Alert.alert(
        'Consentement requis',
        "Tu dois accepter les Conditions d'utilisation et la Politique de confidentialité pour créer un compte."
      );
      return;
    }

    setLoading(true);
    const acceptedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          legal_terms_accepted_at: acceptedAt,
          privacy_policy_accepted_at: acceptedAt,
        },
      },
    });
    if (error) {
      logError(error, { action: 'signup' });
      Alert.alert('Erreur', error.message);
    } else {
      logEvent('auth', 'signup', { email });
      if (!data.session) {
        Alert.alert('Vérification', "Confirme ton email pour activer le compte, puis connecte-toi.");
        goTo('login');
      } else {
        goTo('identity');
      }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (sendingReset) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Email requis', 'Saisis ton email pour recevoir un lien de réinitialisation.');
      return;
    }

    setSendingReset(true);
    try {
      const redirectTo =
        process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL || Linking.createURL('reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) {
        throw error;
      }
      logEvent('auth', 'password_reset_requested', { email: normalizedEmail });
      Alert.alert(
        'Email envoyé',
        'Un lien de réinitialisation vient de t’être envoyé. Vérifie aussi tes spams.'
      );
    } catch (error: any) {
      logError(error, { action: 'password_reset_requested' });
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer l'email de réinitialisation.");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleLogin() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logError(error, { action: 'login' });
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      Alert.alert('Bienvenue !', 'Nous avons besoin de quelques informations supplémentaires.');
      goTo('identity');
    } else {
      logEvent('auth', 'login', { userId: data.user.id });
      const appStateUser = {
        id: profile.id,
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        photos: profile.photos,
        bio: profile.bio,
        interests: profile.interests,
        location: { lat: 0, lng: 0, city: profile.city },
        isVerified: profile.is_verified,
        isPremium: profile.is_premium,
        boosted_until: profile.boosted_until ?? null,
        preferences: {
          targetGender: profile.target_gender ?? [],
          minAge: 18,
          maxAge: 35,
          maxDistance: 50,
        },
      };
      login(appStateUser);
    }
    setLoading(false);
  }

  const toggleInterest = (interest: string) => {
    if (form.interests.includes(interest)) {
      setForm({ ...form, interests: form.interests.filter((i) => i !== interest) });
    } else if (form.interests.length < 5) {
      setForm({ ...form, interests: [...form.interests, interest] });
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la galerie pour continuer.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setForm((prev) => ({ ...prev, photos: [...prev.photos, result.assets[0].uri] }));
    }
  };

  const detectLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setForm((prev) => ({ ...prev, city: 'Yaoundé (par défaut)' }));
    } else {
      setForm((prev) => ({ ...prev, city: 'Localisation activée' }));
    }
  };

  const complete = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logError('user_missing', { action: 'complete_profile' });
      Alert.alert('Erreur', 'Utilisateur non connecté. Impossible de créer le profil.');
      setLoading(false);
      return;
    }

    // Upload photos and get public URLs (fallback to local URIs if bucket not ready)
    const photoUrls: string[] = [];
    for (const uri of form.photos) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
        if (publicUrl) {
          photoUrls.push(publicUrl);
        } else {
          throw new Error('Could not get public URL for photo.');
        }
      } catch (e: any) {
        console.warn('Photo upload failed, using local URI fallback:', e);
        logError(e, { action: 'upload_photo' });
        photoUrls.push(uri);
      }
    }

    if (photoUrls.length === 0) {
      photoUrls.push('https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&h=800&auto=format&fit=crop');
      Alert.alert('Info', "Upload photos indisponible pour l'instant. Une photo par défaut est utilisée.");
    }

    const profileData = {
      id: user.id,
      name: form.name,
      age: Number(form.age),
      gender: form.gender,
      bio: form.bio,
      interests: form.interests,
      city: form.city,
      photos: photoUrls,
      target_gender: form.targetGender,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(profileData);

    if (error) {
      logError(error, { action: 'upsert_profile' });
      Alert.alert('Erreur', 'La sauvegarde du profil a échoué.');
      console.error(error);
    } else {
      logEvent('auth', 'profile_completed', { userId: profileData.id });
      const appStateUser = {
        id: profileData.id,
        name: profileData.name,
        age: profileData.age,
        gender: profileData.gender,
        photos: profileData.photos,
        bio: profileData.bio,
        interests: profileData.interests,
        location: { lat: 0, lng: 0, city: profileData.city },
        isVerified: false,
        isPremium: false,
        boosted_until: null,
        preferences: {
          targetGender: form.targetGender,
          minAge: 18,
          maxAge: 35,
          maxDistance: 50,
        },
      };
      login(appStateUser);
    }
    setLoading(false);
  };

  const isProfileStep = profileSteps.includes(step);

  return (
    <SafeAreaView style={styles.safe}>
      {isProfileStep && (
        <View style={styles.header}>
          <Pressable
            onPress={prevStep}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Retour a l'etape precedente"
            hitSlop={10}
          >
            <ChevronLeft color={COLORS.muted} size={24} />
          </Pressable>
          <Text style={styles.stepText}>Étape {profileSteps.indexOf(step) + 1} sur {profileSteps.length}</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}
      {isProfileStep && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      )}

      {step === 'welcome' && (
        <ImageBackground source={require('../../../assets/akwaba-bg.png')} style={styles.welcome}>
          <View style={styles.welcomeTop}>
            <View style={styles.logoCircle}><Text style={styles.logoText}>Y</Text></View>
            <Text style={styles.brand}>Yamo</Text>
            <Text style={styles.subtitle}>L'amour authentique commence ici.</Text>
          </View>
          <View style={styles.welcomeActions}>
            <PrimaryButton label="Créer un compte" onPress={() => goTo('signup')} />
            <Pressable
              style={styles.secondaryButton}
              onPress={() => goTo('login')}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
            >
              <Text style={styles.secondaryLabel}>Se connecter</Text>
            </Pressable>
            <Text style={styles.legal}>En continuant, vous confirmez avoir 18 ans et acceptez nos conditions.</Text>
          </View>
        </ImageBackground>
      )}

      {(step === 'signup' || step === 'login') && (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            onPress={() => goTo('welcome')}
            style={styles.topBackButton}
            accessibilityRole="button"
            accessibilityLabel="Retour a l'accueil"
            hitSlop={10}
          >
            <ChevronLeft color={COLORS.muted} size={32} />
          </Pressable>

          <Text style={styles.title}>{step === 'signup' ? 'Créer un compte' : 'Se connecter'}</Text>
          <Text style={styles.caption}>Bienvenue sur Yamo !</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor="#475569"
              autoCapitalize='none'
              autoComplete='email'
              keyboardType="email-address"
              textContentType="emailAddress"
              accessibilityLabel="Adresse email"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordInputWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Ton mot de passe"
                placeholderTextColor="#475569"
                secureTextEntry={!isPasswordVisible}
                textContentType="password"
                accessibilityLabel="Mot de passe"
                style={[styles.input, styles.passwordInput]}
              />
              <Pressable
                onPress={() => setIsPasswordVisible((prev) => !prev)}
                style={styles.passwordToggle}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {isPasswordVisible ? (
                  <EyeOff color={COLORS.muted} size={18} />
                ) : (
                  <Eye color={COLORS.muted} size={18} />
                )}
              </Pressable>
            </View>
          </View>

          {step === 'login' && (
            <Pressable
              onPress={handleForgotPassword}
              disabled={sendingReset}
              style={styles.forgotPasswordButton}
              accessibilityRole="button"
              accessibilityLabel="Mot de passe oublié"
            >
              <Text style={styles.forgotPasswordText}>
                {sendingReset ? 'Envoi en cours…' : 'Mot de passe oublié ?'}
              </Text>
            </Pressable>
          )}

          {step === 'signup' && (
            <View style={styles.legalConsentCard}>
              <Pressable
                onPress={() => setHasAcceptedLegal((prev) => !prev)}
                style={styles.checkboxRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hasAcceptedLegal }}
                accessibilityLabel="Accepter les conditions d'utilisation et la politique de confidentialité"
              >
                {hasAcceptedLegal ? (
                  <CheckSquare color={COLORS.primary} size={20} />
                ) : (
                  <Square color="#64748b" size={20} />
                )}
                <Text style={styles.checkboxText}>
                  J'accepte les Conditions générales d'utilisation et la Politique de confidentialité.
                </Text>
              </Pressable>

              <View style={styles.legalLinksRow}>
                <Pressable onPress={() => openLegalDocument(TERMS_URL, 'cgu')}>
                  <Text style={styles.legalLink}>Voir les CGU</Text>
                </Pressable>
                <Text style={styles.legalDot}>•</Text>
                <Pressable onPress={() => openLegalDocument(PRIVACY_URL, 'privacy')}>
                  <Text style={styles.legalLink}>Voir la politique de confidentialité</Text>
                </Pressable>
              </View>
            </View>
          )}

          <PrimaryButton
            label={step === 'signup' ? 'Continuer' : 'Se connecter'}
            onPress={step === 'signup' ? handleSignUp : handleLogin}
            disabled={loading || !email || !password || (step === 'signup' && !hasAcceptedLegal)}
          />
        </ScrollView>
      )}

      {step === 'identity' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>C'est quoi ton petit nom ?</Text>
          <Text style={styles.caption}>C'est ainsi que tes futurs matchs te verront.</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="Ton prénom"
              placeholderTextColor="#475569"
              accessibilityLabel="Prenom"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Âge</Text>
            <TextInput
              value={form.age}
              onChangeText={(text) => setForm({ ...form, age: text })}
              placeholder="18+"
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              accessibilityLabel="Age"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Genre</Text>
            <View style={styles.row}>
              {[Gender.FEMALE, Gender.MALE].map((gender) => (
                <Pressable
                  key={gender}
                  onPress={() => setForm({ ...form, gender })}
                  style={[styles.choiceButton, form.gender === gender && styles.choiceButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={gender === Gender.FEMALE ? 'Choisir Femme' : 'Choisir Homme'}
                >
                  <Text style={[styles.choiceLabel, form.gender === gender && styles.choiceLabelActive]}>
                    {gender === Gender.FEMALE ? 'Femme' : 'Homme'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <PrimaryButton
            label="Continuer"
            onPress={nextStep}
            disabled={!form.name || !form.age || Number(form.age) < 18}
          />
        </ScrollView>
      )}

      {step === 'photos' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Ajoute tes plus belles photos</Text>
          <Text style={styles.caption}>Les profils avec 3+ photos ont 2x plus de matchs.</Text>
          <View style={styles.photoGrid}>
            {[0, 1, 2, 3, 4, 5].map((slot) => {
              const uri = form.photos[slot];
              return (
                <Pressable
                  key={slot}
                  onPress={pickImage}
                  style={styles.photoSlot}
                  accessibilityRole="button"
                  accessibilityLabel={uri ? `Photo ${slot + 1}` : `Ajouter la photo ${slot + 1}`}
                  hitSlop={6}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Camera color={COLORS.muted} size={28} />
                      <Text style={styles.photoText}>Ajouter</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label="Continuer" onPress={nextStep} disabled={form.photos.length === 0} />
        </ScrollView>
      )}

      {step === 'bio' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Un petit mot sur toi</Text>
          <Text style={styles.caption}>Sois authentique, ça aide à matcher.</Text>
          <TextInput
            value={form.bio}
            onChangeText={(text) => setForm({ ...form, bio: text })}
            placeholder="Écris une courte bio..."
            placeholderTextColor="#475569"
            multiline
            accessibilityLabel="Biographie"
            style={[styles.input, styles.textArea]}
          />
          <PrimaryButton label="Continuer" onPress={nextStep} disabled={!form.bio} />
        </ScrollView>
      )}

      {step === 'preferences' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Tes centres d'intérêt</Text>
          <Text style={styles.caption}>Choisis jusqu'à 5 centres d'intérêt.</Text>
          <View style={styles.wrap}>
            {INTERESTS_OPTIONS.map((interest) => {
              const active = form.interests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  style={[styles.tag, active && styles.tagActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${interest}${active ? ', selectionne' : ''}`}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{interest}</Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label="Continuer" onPress={nextStep} disabled={form.interests.length === 0} />
        </ScrollView>
      )}

      {step === 'location' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Localisation</Text>
          <Text style={styles.caption}>Pour te proposer des profils proches de toi.</Text>
          <Pressable
            style={styles.locationCard}
            onPress={detectLocation}
            accessibilityRole="button"
            accessibilityLabel="Detecter ma position"
          >
            <MapPin color={COLORS.primary} size={24} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>Détecter ma position</Text>
              <Text style={styles.locationSubtitle}>{form.city}</Text>
            </View>
          </Pressable>
          <PrimaryButton label="Terminer" onPress={complete} disabled={loading} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    borderRadius: 999,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  welcome: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 32,
  },
  welcomeTop: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
  },
  brand: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  subtitle: {
    color: '#f8fafc',
    marginTop: 8,
    fontWeight: '500',
  },
  welcomeActions: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 18,
  },
  topBackButton: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.ink,
  },
  caption: {
    fontSize: 14,
    color: COLORS.muted,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  field: {
    gap: 8,
  },
  passwordInputWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 46,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 28,
  },
  legalConsentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkboxText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  legalLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 30,
  },
  legalLink: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  legalDot: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: COLORS.ink,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  choiceButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  choiceLabel: {
    fontWeight: '700',
    color: '#475569',
  },
  choiceLabelActive: {
    color: '#fff',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  tagActive: {
    backgroundColor: COLORS.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  tagTextActive: {
    color: '#fff',
  },
  locationCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  locationCopy: {
    gap: 4,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  locationSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
});

export default AuthFlowScreen;
