
import React, { useEffect, useMemo, useState } from 'react';
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
import { Camera, CheckSquare, ChevronLeft, Eye, EyeOff, MapPin, Square, Heart, Users, Coffee } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { Gender } from '../../types';
import { useApp } from '../../state/AppContext';
import PrimaryButton from '../../components/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { apiRequest } from '../../lib/api';
import { logEvent, logError } from '../../lib/analytics';
import { getPasswordPolicyHint, validatePasswordPolicy } from '../../lib/passwordPolicy';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';

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

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Amour sérieux', icon: (props: any) => <Heart {...props} /> },
  { id: 'FRIENDSHIP', label: 'Amitié', icon: (props: any) => <Users {...props} /> },
  { id: 'CASUAL', label: 'On verra bien', icon: (props: any) => <Coffee {...props} /> },
];

type Step = 'welcome' | 'signup' | 'login' | 'identity' | 'photos' | 'bio' | 'preferences' | 'goal' | 'location';

type CountryOption = { code: string; name: string; callingCode: string };

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'CM', name: 'Cameroun', callingCode: '237' },
  { code: 'CI', name: "Cote d'Ivoire", callingCode: '225' },
  { code: 'SN', name: 'Senegal', callingCode: '221' },
  { code: 'TG', name: 'Togo', callingCode: '228' },
  { code: 'BJ', name: 'Benin', callingCode: '229' },
  { code: 'ML', name: 'Mali', callingCode: '223' },
  { code: 'NG', name: 'Nigeria', callingCode: '234' },
  { code: 'GH', name: 'Ghana', callingCode: '233' },
  { code: 'GA', name: 'Gabon', callingCode: '241' },
  { code: 'CD', name: 'RD Congo', callingCode: '243' },
  { code: 'KE', name: 'Kenya', callingCode: '254' },
  { code: 'ZA', name: 'Afrique du Sud', callingCode: '27' },
  { code: 'MA', name: 'Maroc', callingCode: '212' },
  { code: 'DZ', name: 'Algerie', callingCode: '213' },
  { code: 'TN', name: 'Tunisie', callingCode: '216' },
  { code: 'FR', name: 'France', callingCode: '33' },
  { code: 'BE', name: 'Belgique', callingCode: '32' },
  { code: 'CH', name: 'Suisse', callingCode: '41' },
  { code: 'DE', name: 'Allemagne', callingCode: '49' },
  { code: 'ES', name: 'Espagne', callingCode: '34' },
  { code: 'IT', name: 'Italie', callingCode: '39' },
  { code: 'GB', name: 'Royaume-Uni', callingCode: '44' },
  { code: 'US', name: 'Etats-Unis', callingCode: '1' },
  { code: 'CA', name: 'Canada', callingCode: '1' },
];

const COUNTRY_BY_CODE = COUNTRY_OPTIONS.reduce((acc, country) => {
  acc[country.code] = country;
  return acc;
}, {} as Record<string, CountryOption>);

const getDeviceRegion = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const parts = locale.split(/[-_]/);
    return (parts[1] || '').toUpperCase();
  } catch (_e) {
    return '';
  }
};

const getDefaultCountryCode = () => {
  const region = getDeviceRegion();
  return COUNTRY_BY_CODE[region] ? region : 'CM';
};

const getDefaultCountry = () => COUNTRY_BY_CODE[getDefaultCountryCode()] || COUNTRY_BY_CODE.CM;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  return cleaned;
};
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidPhone = (value: string) => /^\+[1-9]\d{7,14}$/.test(value);
const OTP_COOLDOWN_SECONDS = 45;
const OTP_COOLDOWN_RATE_LIMIT_SECONDS = 60;

const AuthFlowScreen: React.FC = () => {
  const { login, refreshCurrentUser } = useApp();
  const [step, setStep] = useState<Step>('welcome');

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMode, setOtpMode] = useState<'signup' | 'login' | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(() => getDefaultCountry());
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [otpCooldownRemaining, setOtpCooldownRemaining] = useState(0);

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: Gender.FEMALE,
    photos: [] as string[],
    bio: '',
    interests: [] as string[],
    relationshipGoal: 'SERIOUS',
    targetGender: [Gender.MALE] as Gender[],
    city: 'Douala',
    country: '',
  });

  const profileSteps: Step[] = ['identity', 'photos', 'bio', 'preferences', 'goal', 'location'];
  const progress = useMemo(() => {
    const index = Math.max(0, profileSteps.indexOf(step));
    return Math.round((index / (profileSteps.length - 1)) * 100);
  }, [step, profileSteps]);

  const selectedCallingCode = useMemo(() => selectedCountry.callingCode, [selectedCountry]);
  const selectedPhonePrefix = selectedCallingCode ? `+${selectedCallingCode}` : '+';

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((country) => (
      country.name.toLowerCase().includes(q)
      || country.code.toLowerCase().includes(q)
      || country.callingCode.includes(q.replace('+', ''))
    ));
  }, [countrySearch]);

  const canSubmitEmail = isValidEmail(normalizeEmail(identifier));
  const canSubmitPhone = isValidPhone(normalizePhone(identifier));
  const passwordPolicy = useMemo(() => validatePasswordPolicy(password), [password]);
  const passwordPolicyHint = useMemo(() => getPasswordPolicyHint(), []);

  const handleIdentifierChange = (value: string) => {
    if (authMethod !== 'phone') {
      setIdentifier(value);
      return;
    }

    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setIdentifier(selectedPhonePrefix);
      return;
    }

    const code = selectedCallingCode || '';
    const localPart = digits.startsWith(code) ? digits.slice(code.length) : digits;
    setIdentifier(`+${code}${localPart}`);
  };

  useEffect(() => {
    if (authMethod === 'phone') {
      setIdentifier((prev) => {
        const normalized = normalizePhone(prev);
        if (normalized && normalized.startsWith('+')) return normalized;
        return selectedPhonePrefix;
      });
      setIsCountryPickerOpen(false);
    } else {
      setIdentifier('');
      setOtpCode('');
      setOtpSent(false);
      setOtpMode(null);
      setOtpCooldownRemaining(0);
      setIsCountryPickerOpen(false);
    }
  }, [authMethod, selectedPhonePrefix]);

  useEffect(() => {
    if (authMethod === 'phone' && otpSent) {
      setOtpSent(false);
      setOtpCode('');
      setOtpMode(null);
      setOtpCooldownRemaining(0);
    }
  }, [identifier]);

  useEffect(() => {
    if (authMethod !== 'phone') return;
    const digits = identifier.replace(/\D/g, '');
    const code = selectedCallingCode || '';
    const localPart = digits.startsWith(code) ? digits.slice(code.length) : digits;
    setIdentifier(`+${code}${localPart}`);
  }, [selectedCountry]);

  useEffect(() => {
    if (step !== 'signup' && step !== 'login') {
      setOtpSent(false);
      setOtpCode('');
      setOtpMode(null);
      setOtpCooldownRemaining(0);
    }
  }, [step]);

  useEffect(() => {
    if (otpCooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldownRemaining]);

  useEffect(() => {
    if (!isCountryPickerOpen) setCountrySearch('');
  }, [isCountryPickerOpen]);

  useEffect(() => {
    let active = true;

    const resumeIncompleteOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session?.user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, suspended_at, onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active || error || !profile || profile.suspended_at || profile.onboarding_completed) return;
      goTo('identity');
    };

    void resumeIncompleteOnboarding();

    return () => {
      active = false;
    };
  }, []);

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

  const normalizeAuthError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || 0);

    if (
      status === 429
      || message.includes('too many request')
      || message.includes('rate limit')
      || message.includes('over_email_send_rate_limit')
    ) {
      return {
        code: 'too_many_requests' as const,
        userMessage: 'Trop de tentatives. Attends un peu avant de reessayer.',
      };
    }

    if (
      message.includes('invalid otp')
      || message.includes('otp is invalid')
      || message.includes('token has expired')
      || message.includes('otp expired')
      || message.includes('verification code')
    ) {
      return {
        code: 'invalid_otp' as const,
        userMessage: 'Code invalide ou expire. Demande un nouveau code SMS.',
      };
    }

    return {
      code: 'unknown' as const,
      userMessage: error?.message || 'Une erreur est survenue.',
    };
  };

  const finalizeLogin = async (userId: string, method: 'email' | 'phone') => {
    try {
      const refreshed = await refreshCurrentUser(userId);
      if (refreshed) {
        logEvent('auth', 'login', { userId, method });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, suspended_at, onboarding_completed')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          Alert.alert('Bienvenue !', 'Nous avons besoin de quelques informations supplementaires.');
          goTo('identity');
          return;
        }
        logError(profileError, { action: 'login_profile_lookup' });
        Alert.alert('Erreur', "Impossible de charger votre profil pour le moment.");
        return;
      }

      if (profile?.suspended_at) {
        await supabase.auth.signOut({ scope: 'local' });
        Alert.alert('Compte suspendu', 'Votre compte est suspendu. Contactez le support.');
        return;
      }

      if (!profile || !profile.onboarding_completed) {
        Alert.alert('Bienvenue !', 'Nous avons besoin de quelques informations supplementaires.');
        goTo('identity');
        return;
      }

      Alert.alert('Erreur', "Impossible d'initialiser votre session pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (mode: 'signup' | 'login') => {
    const normalizedPhone = normalizePhone(identifier);
    if (!isValidPhone(normalizedPhone)) {
      Alert.alert('Telephone invalide', "Utilise le format international, ex: +2376XXXXXXXX.");
      return;
    }

    if (otpCooldownRemaining > 0) {
      Alert.alert('Patiente un instant', `Tu peux demander un nouveau code dans ${otpCooldownRemaining}s.`);
      return;
    }

    if (mode === 'signup' && !hasAcceptedLegal) {
      Alert.alert(
        'Consentement requis',
        "Tu dois accepter les Conditions d'utilisation et la Politique de confidentialite pour creer un compte."
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: mode === 'signup',
        channel: 'sms',
      },
    });

    if (error) {
      const normalizedError = normalizeAuthError(error);
      logError(error, { action: 'otp_request', mode });
      if (normalizedError.code === 'too_many_requests') {
        setOtpCooldownRemaining((prev) => Math.max(prev, OTP_COOLDOWN_RATE_LIMIT_SECONDS));
      }
      Alert.alert('Erreur', normalizedError.userMessage);
      setLoading(false);
      return;
    }

    setOtpCode('');
    setOtpSent(true);
    setOtpMode(mode);
    setOtpCooldownRemaining(OTP_COOLDOWN_SECONDS);
    logEvent('auth', 'otp_requested', { method: 'phone', mode });
    Alert.alert('Code envoye', "Un code SMS vient d'etre envoye.");
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    const normalizedPhone = normalizePhone(identifier);
    if (!isValidPhone(normalizedPhone)) {
      Alert.alert('Telephone invalide', "Utilise le format international, ex: +2376XXXXXXXX.");
      return;
    }
    if (!otpCode.trim()) {
      Alert.alert('Code requis', 'Saisis le code SMS pour continuer.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otpCode.trim(),
      type: 'sms',
    });

    if (error || !data?.user) {
      const normalizedError = normalizeAuthError(error);
      logError(error || 'otp_missing_user', { action: 'otp_verify' });
      Alert.alert('Erreur', normalizedError.userMessage);
      setLoading(false);
      return;
    }

    if (otpMode === 'signup') {
      const acceptedAt = new Date().toISOString();
      const { error: consentError } = await supabase.auth.updateUser({
        data: {
          ...(data.user.user_metadata || {}),
          legal_terms_accepted_at: acceptedAt,
          privacy_policy_accepted_at: acceptedAt,
        },
      });

      if (consentError) {
        logError(consentError, { action: 'otp_signup_consent_persist' });
        await supabase.auth.signOut({ scope: 'local' });
        setOtpSent(false);
        setOtpCode('');
        setOtpMode(null);
        setLoading(false);
        Alert.alert(
          'Erreur',
          "Le compte a ete cree, mais l'enregistrement du consentement legal a echoue. Reessaie."
        );
        return;
      }
    }

    setOtpSent(false);
    setOtpCode('');
    setOtpMode(null);
    logEvent('auth', 'otp_verified', { method: 'phone' });
    await finalizeLogin(data.user.id, 'phone');
  };

  async function handleSignUp() {
    if (authMethod !== 'email') return;

    if (!hasAcceptedLegal) {
      Alert.alert(
        'Consentement requis',
        "Tu dois accepter les Conditions d'utilisation et la Politique de confidentialite pour creer un compte."
      );
      return;
    }

    const normalizedEmail = normalizeEmail(identifier);
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Email invalide', 'Saisis une adresse email valide pour continuer.');
      return;
    }
    if (!passwordPolicy.valid) {
      Alert.alert('Mot de passe trop faible', `Le mot de passe doit contenir ${passwordPolicy.reasons.join(', ')}.`);
      return;
    }

    setLoading(true);
    const acceptedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
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
      logEvent('auth', 'signup', { method: 'email' });
      if (!data.session) {
        Alert.alert('Verification', "Confirme ton email pour activer le compte, puis connecte-toi.");
        goTo('login');
      } else {
        goTo('identity');
      }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (sendingReset) return;

    if (authMethod !== 'email') {
      Alert.alert('Indisponible', 'La reinitialisation est disponible uniquement pour les comptes email.');
      return;
    }

    const normalizedEmail = normalizeEmail(identifier);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      Alert.alert('Email requis', 'Saisis ton email pour recevoir un lien de reinitialisation.');
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
      logEvent('auth', 'password_reset_requested', { method: 'email' });
      Alert.alert(
        'Email envoye',
        "Un lien de reinitialisation vient de t'etre envoye. Verifie aussi tes spams."
      );
    } catch (error: any) {
      logError(error, { action: 'password_reset_requested' });
      Alert.alert('Erreur', error?.message || "Impossible d'envoyer l'email de reinitialisation.");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleLogin() {
    if (authMethod !== 'email') return;

    const normalizedEmail = normalizeEmail(identifier);
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Email invalide', 'Saisis une adresse email valide pour continuer.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      logError(error, { action: 'login' });
      Alert.alert('Erreur', error.message);
      setLoading(false);
      return;
    }

    await finalizeLogin(data.user.id, 'email');
  }

  const handlePrimaryAction = () => {
    if (authMethod === 'email') {
      if (step === 'signup') {
        void handleSignUp();
        return;
      }
      void handleLogin();
      return;
    }

    if (!otpSent) {
      void handleSendOtp(step === 'signup' ? 'signup' : 'login');
      return;
    }

    void handleVerifyOtp();
  };

  const toggleInterest = (interest: string) => {
    if (form.interests.includes(interest)) {
      setForm({ ...form, interests: form.interests.filter((i) => i !== interest) });
    } else if (form.interests.length < 5) {
      setForm({ ...form, interests: [...form.interests, interest] });
    }
  };

  const pickImage = async (slot: number) => {
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
      setForm((prev) => {
        const nextPhotos = [...prev.photos];
        if (slot < nextPhotos.length) {
          nextPhotos[slot] = result.assets[0].uri;
        } else if (nextPhotos.length < 6) {
          nextPhotos.push(result.assets[0].uri);
        }
        return { ...prev, photos: nextPhotos.slice(0, 6) };
      });
    }
  };

  const removePhoto = (slot: number) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== slot),
    }));
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

    const normalizedUserPhone = user.phone ? normalizePhone(user.phone) : null;

    if (form.photos.length < 3 || form.photos.length > 6) {
      Alert.alert('Photos requises', 'Ajoute entre 3 et 6 photos pour continuer.');
      setLoading(false);
      return;
    }

    // Upload photos and get public URLs.
    const photoUrls: string[] = [];
    for (const uri of form.photos) {
      try {
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const normalizedExt = fileExt.toLowerCase();

        await uploadArrayBufferToBucket({
          bucket: 'photos',
          path: filePath,
          uri,
          contentType: `image/${normalizedExt === 'png' ? 'png' : 'jpeg'}`,
        });

        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
        if (publicUrl) {
          photoUrls.push(publicUrl);
        } else {
          throw new Error('Could not get public URL for photo.');
        }
      } catch (e: any) {
        logError(e, { action: 'upload_photo' });
        Alert.alert(
          'Upload photo impossible',
          "Une ou plusieurs photos n'ont pas pu être envoyées. Vérifie ta connexion puis réessaie."
        );
        setLoading(false);
        return;
      }
    }

    let photoReviewStatus: 'APPROVED' | 'PENDING' = 'APPROVED';
    try {
      const moderation = await apiRequest<{
        status: 'APPROVED' | 'PENDING' | 'REJECTED';
        violations?: Array<{ url: string; flags: string[] }>;
      }>('/api/moderation/photos/check', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ photoUrls }),
      });

      if (moderation.status === 'REJECTED') {
        const violations = moderation.violations || [];
        const flagLabels: Record<string, string> = {
          invalid_url: 'URL invalide',
          not_owned: 'photo non autorisée',
          invalid_extension: 'format non supporté',
          invalid_mime: 'type de fichier invalide',
          too_large: 'fichier trop lourd',
          not_found: 'fichier introuvable',
          suspicious_filename: 'contenu suspect',
        };
        const messages = violations.map((item) => {
          const index = photoUrls.findIndex((u) => u === item.url);
          const label = index >= 0 ? `Photo ${index + 1}` : 'Photo';
          const reason = (item.flags || [])
            .map((flag) => flagLabels[flag] || flag)
            .join(', ') || 'non conforme';
          return `${label}: ${reason}`;
        });
        Alert.alert(
          'Photos refusées',
          messages.length > 0
            ? messages.join('\n')
            : "Certaines photos ne respectent pas nos règles. Choisis d'autres photos et réessaie."
        );
        setLoading(false);
        return;
      }

      if (moderation.status === 'PENDING') {
        photoReviewStatus = 'PENDING';
        Alert.alert(
          'Photos en revue',
          "Certaines photos sont en cours de vérification. Tu peux continuer, mais ton profil ne sera pas visible dans la découverte tant qu'elles ne sont pas approuvées."
        );
      }
    } catch (error: any) {
      logError(error, { action: 'photo_moderation' });
      Alert.alert('Erreur', error?.message || "Impossible de vérifier les photos.");
      setLoading(false);
      return;
    }

    const profileData = {
      id: user.id,
      name: form.name,
      age: Number(form.age),
      gender: form.gender,
      bio: form.bio,
      interests: form.interests,
      city: form.city,
      country: form.country,
      photos: photoUrls,
      photo_review_status: photoReviewStatus,
      target_gender: form.targetGender,
      relationship_goal: form.relationshipGoal,
      phone: normalizedUserPhone,
      onboarding_completed: true,
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
        phone: profileData.phone ?? null,
        location: { lat: 0, lng: 0, city: profileData.city, country: profileData.country },
        isVerified: false,
        isPremium: false,
        boosted_until: null,
        relationship_goal: profileData.relationship_goal,
        likes_count: 0,
        last_active_at: new Date().toISOString(),
        is_invisible: false,
        subscription_plan_id: null,
        invisible_mode_eligible: false,
        is_admin: false,
        suspended_at: null,
        photo_review_status: photoReviewStatus,
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
            <Image source={require('../../../assets/logo_yamo.jpg')} style={styles.logoImage} />
            <Text style={styles.brand}>Yamo</Text>
            <Text style={styles.subtitle}>L'amour authentique commence ici.</Text>
          </View>
          <View style={welcomeStyles.actions}>
            <PrimaryButton label="Créer un compte" onPress={() => goTo('signup')} />
            <Pressable
              style={welcomeStyles.secondaryButton}
              onPress={() => goTo('login')}
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
            >
              <Text style={welcomeStyles.secondaryLabel}>Se connecter</Text>
            </Pressable>
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

          <View style={styles.authMethodRow}>
            <Pressable
              onPress={() => setAuthMethod('email')}
              style={[styles.authMethodChip, authMethod === 'email' && styles.authMethodChipActive]}
              accessibilityRole="button"
              accessibilityLabel="Utiliser email"
            >
              <Text style={[styles.authMethodLabel, authMethod === 'email' && styles.authMethodLabelActive]}>
                Email
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAuthMethod('phone')}
              style={[styles.authMethodChip, authMethod === 'phone' && styles.authMethodChipActive]}
              accessibilityRole="button"
              accessibilityLabel="Utiliser telephone"
            >
              <Text style={[styles.authMethodLabel, authMethod === 'phone' && styles.authMethodLabelActive]}>
                Telephone
              </Text>
            </Pressable>
          </View>

          {authMethod === 'phone' && (
            <View style={styles.field}>
              <Text style={styles.label}>Pays</Text>
              <Pressable
                onPress={() => setIsCountryPickerOpen((prev) => !prev)}
                style={styles.countrySelector}
                accessibilityRole="button"
                accessibilityLabel="Choisir un pays"
              >
                <Text style={styles.countrySelectorText}>
                  {selectedCountry.name} (+{selectedCountry.callingCode})
                </Text>
              </Pressable>
              {isCountryPickerOpen && (
                <View style={styles.countryList}>
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Rechercher un pays"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    style={styles.countrySearchInput}
                  />
                  <ScrollView style={styles.countryScroll} nestedScrollEnabled>
                    {filteredCountries.map((country) => {
                      const selected = country.code === selectedCountry.code;
                      return (
                        <Pressable
                          key={country.code}
                          onPress={() => {
                            setSelectedCountry(country);
                            setIsCountryPickerOpen(false);
                            setCountrySearch('');
                          }}
                          style={[styles.countryOption, selected && styles.countryOptionActive]}
                        >
                          <Text style={[styles.countryOptionText, selected && styles.countryOptionTextActive]}>
                            {country.name} (+{country.callingCode})
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>{authMethod === 'email' ? 'Email' : 'Telephone'}</Text>
            <TextInput
              value={identifier}
              onChangeText={handleIdentifierChange}
              placeholder={authMethod === 'email' ? 'ton@email.com' : `${selectedPhonePrefix}6XXXXXXXX`}
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoComplete={authMethod === 'email' ? 'email' : 'tel'}
              keyboardType={authMethod === 'email' ? 'email-address' : 'phone-pad'}
              textContentType={authMethod === 'email' ? 'emailAddress' : 'telephoneNumber'}
              accessibilityLabel={authMethod === 'email' ? 'Adresse email' : 'Numero de telephone'}
              style={styles.input}
            />
            {authMethod === 'phone' && (
              <Text style={styles.helperText}>
                Format international requis (ex: {selectedPhonePrefix}6XXXXXXXX).
              </Text>
            )}
          </View>

          {authMethod === 'phone' && !otpSent && (
            <Text style={styles.helperText}>Nous allons t'envoyer un code SMS.</Text>
          )}

          {authMethod === 'phone' && otpSent && (
            <View style={styles.field}>
              <Text style={styles.label}>Code SMS</Text>
              <TextInput
                value={otpCode}
                onChangeText={(value) => setOtpCode(value.replace(/\D/g, ''))}
                placeholder="123456"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                accessibilityLabel="Code SMS"
                style={styles.input}
              />
              <Pressable
                onPress={() => void handleSendOtp(step === 'signup' ? 'signup' : 'login')}
                style={styles.resendButton}
                disabled={loading || otpCooldownRemaining > 0}
                accessibilityRole="button"
                accessibilityLabel="Renvoyer le code"
              >
                <Text style={styles.resendText}>
                  {otpCooldownRemaining > 0 ? `Renvoyer le code (${otpCooldownRemaining}s)` : 'Renvoyer le code'}
                </Text>
              </Pressable>
            </View>
          )}

          {authMethod === 'email' && (
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
              {step === 'signup' && (
                <Text style={styles.helperText}>{passwordPolicyHint}</Text>
              )}
            </View>
          )}

          {step === 'login' && authMethod === 'email' && (
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
            label={
              authMethod === 'email'
                ? (step === 'signup' ? 'Continuer' : 'Se connecter')
                : (otpSent ? 'Verifier le code' : 'Envoyer le code')
            }
            onPress={handlePrimaryAction}
            disabled={
              loading
              || (authMethod === 'email'
                ? (!identifier || !password || !canSubmitEmail || (step === 'signup' && !passwordPolicy.valid))
                : (!canSubmitPhone || (otpSent && otpCode.trim().length < 6)))
              || (step === 'signup' && !hasAcceptedLegal)
            }
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
          <Text style={styles.caption}>Ajoute entre 3 et 6 photos pour activer ton profil.</Text>
          <View style={styles.photoGrid}>
            {[0, 1, 2, 3, 4, 5].map((slot) => {
              const uri = form.photos[slot];
              return (
                <Pressable
                  key={slot}
                  onPress={() => void pickImage(slot)}
                  onLongPress={() => uri ? removePhoto(slot) : undefined}
                  style={styles.photoSlot}
                  accessibilityRole="button"
                  accessibilityLabel={uri ? `Photo ${slot + 1}, appui long pour supprimer` : `Ajouter la photo ${slot + 1}`}
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
          <Text style={styles.caption}>Photos: {form.photos.length}/6 (minimum 3)</Text>
          <PrimaryButton label="Continuer" onPress={nextStep} disabled={form.photos.length < 3 || form.photos.length > 6} />
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

      {step === 'goal' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Que cherches-tu sur Yamo ?</Text>
          <Text style={styles.caption}>Sois honnête sur tes intentions.</Text>
          <View style={styles.goalList}>
            {RELATIONSHIP_GOALS.map((goal) => {
              const active = form.relationshipGoal === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  style={[styles.goalCard, active && styles.goalCardActive]}
                  onPress={() => setForm({ ...form, relationshipGoal: goal.id })}
                >
                  <View style={[styles.goalIconWrap, active && styles.goalIconWrapActive]}>
                    {goal.icon({ color: active ? '#fff' : COLORS.primary, size: 24 })}
                  </View>
                  <Text style={[styles.goalLabel, active && styles.goalLabelActive]}>{goal.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton label="Continuer" onPress={nextStep} />
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
          <TextInput
            value={form.city}
            onChangeText={(text) => setForm({ ...form, city: text })}
            placeholder="Ville"
            style={styles.input}
          />
          <TextInput
            value={form.country}
            onChangeText={(text) => setForm({ ...form, country: text })}
            placeholder="Pays"
            style={styles.input}
          />
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
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 25,
    marginBottom: 20,
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
  resendButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  authMethodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  authMethodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  authMethodChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  authMethodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  authMethodLabelActive: {
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 6,
  },
  countrySelector: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  countrySelectorText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  countryList: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    maxHeight: 220,
  },
  countrySearchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    fontSize: 13,
    color: COLORS.ink,
  },
  countryScroll: {
    maxHeight: 220,
  },
  countryOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  countryOptionActive: {
    backgroundColor: '#e0f2fe',
  },
  countryOptionText: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '600',
  },
  countryOptionTextActive: {
    color: '#0369a1',
    fontWeight: '800',
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
  goalList: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  goalCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  goalIconWrapActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
  },
  goalLabelActive: {
    color: COLORS.primary,
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

const welcomeStyles = StyleSheet.create({
  actions: {
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
});

export default AuthFlowScreen;
