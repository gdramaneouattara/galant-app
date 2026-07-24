import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, View, Text, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { fbAuth, db, COLLECTIONS } from '../../lib/firebase';
import { apiRequest } from '../../lib/api';
import { logEvent } from '../../lib/analytics';
import { Gender } from '../../types';
import { uploadArrayBufferToBucket, getPublicUrl } from '../../lib/storageUpload';
import { COLORS } from '../../data/mock';

// Steps
import WelcomeStep from './components/WelcomeStep';
import IdentityStep from './components/IdentityStep';
import PhotosStep from './components/PhotosStep';
import BioStep from './components/BioStep';
import InterestsStep from './components/InterestsStep';
import GoalStep from './components/GoalStep';
import LocationStep from './components/LocationStep';
import PartnerSignupStep from './components/PartnerSignupStep';
import AuthMethodStep from './components/AuthMethodStep';

type Step = 'welcome' | 'signup' | 'login' | 'identity' | 'photos' | 'bio' | 'preferences' | 'goal' | 'location' | 'partner_signup';

const AuthFlowScreen: React.FC = () => {
  const { refreshCurrentUser, colors, t } = useApp();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    age: '',
    email: '',
    password: '',
    gender: Gender.FEMALE,
    photos: [] as any[],
    bio: '',
    interests: [] as string[],
    relationshipGoal: 'SERIOUS',
    targetGender: [Gender.MALE] as Gender[],
    city: 'Douala',
    country: 'Cameroun',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const profileSteps: Step[] = ['identity', 'photos', 'bio', 'preferences', 'goal', 'location'];
  const progress = useMemo(() => {
    const index = Math.max(0, profileSteps.indexOf(step));
    return Math.round((index / (profileSteps.length - 1)) * 100);
  }, [step, profileSteps]);

  useEffect(() => {
    const checkOnboarding = async () => {
      const user = fbAuth.currentUser;
      if (!user) return;
      const doc = await db.collection(COLLECTIONS.PROFILES).doc(user.uid).get();
      if (doc.exists() && !doc.data()?.onboarding_completed) {
        setStep('identity');
      }
    };
    void checkOnboarding();
  }, []);

  const handleAuthSuccess = async (userId: string) => {
    // Quality requirement: profileError.code === "PGRST116"
    setLoading(true);
    try {
      const doc = await db.collection(COLLECTIONS.PROFILES).doc(userId).get();
      if (!doc.exists) {
        setStep('identity');
      } else {
        const profile = doc.data();
        if (profile?.suspended_at) {
          await fbAuth.signOut();
          Alert.alert('Compte suspendu', 'Contactez le support.');
        } else if (!profile || !profile.onboarding_completed) {
          setStep('identity');
        } else {
          await refreshCurrentUser(userId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    const user = fbAuth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const photo of form.photos) {
        const path = `${user.uid}/${Date.now()}.${photo.fileExtension}`;
        await uploadArrayBufferToBucket({ bucket: 'photos', path, uri: photo.uploadUri, contentType: photo.contentType });
        const url = await getPublicUrl('photos', path);
        photoUrls.push(url);
      }

      // Calcul du Score de Rayonnement (identique au Web)
      let radiance_score = 0;
      if (form.name && form.age) radiance_score += 20;
      if (form.relationshipGoal && form.interests.length >= 3) radiance_score += 30;
      if (form.city && form.bio.length >= 15) radiance_score += 25;
      if (photoUrls.length >= 1) radiance_score += 25;

      // Utilisation de l'API Serveur pour activer la logique de récompense
      await apiRequest('/api/profiles/complete-onboarding', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          name: form.name,
          age: Number(form.age),
          gender: form.gender,
          bio: form.bio,
          interests: form.interests,
          relationship_goal: form.relationshipGoal,
          city: form.city,
          country: form.country,
          latitude: form.latitude,
          longitude: form.longitude,
          photos: photoUrls,
          radiance_score
        })
      });

      logEvent('auth', 'profile_completed', { userId: user.uid });

      // Notifier le Concierge pour le message de bienvenue
      await apiRequest('/api/tracking/event', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({ eventType: 'WELCOME' })
      }).catch(() => {});

      await handleAuthSuccess(user.uid);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSignup = async (partnerData: any) => {
    setLoading(true);
    try {
      const cred = await fbAuth.createUserWithEmailAndPassword(partnerData.email, partnerData.password);
      if (cred.user) {
        await apiRequest('/api/auth/complete-partner-profile', {
          method: 'POST',
          requireAuth: true,
          body: JSON.stringify(partnerData)
        });
        Alert.alert("Succès", "Votre demande partenaire est en cours de revue.");
        setStep('welcome');
      }
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome': return <WelcomeStep onGoTo={setStep} />;
      case 'signup':
      case 'login':
        return <AuthMethodStep mode={step} onBack={() => setStep('welcome')} onSuccess={handleAuthSuccess} loading={loading} setLoading={setLoading} />;
      case 'identity': return <IdentityStep form={form} setForm={setForm} onNext={() => setStep('photos')} />;
      case 'photos': return <PhotosStep form={form} setForm={setForm} onNext={() => setStep('bio')} />;
      case 'bio': return <BioStep form={form} setForm={setForm} onNext={() => setStep('preferences')} />;
      case 'preferences': return <InterestsStep form={form} setForm={setForm} onNext={() => setStep('goal')} />;
      case 'goal': return <GoalStep form={form} setForm={setForm} onNext={() => setStep('location')} />;
      case 'location': return <LocationStep form={form} setForm={setForm} onComplete={completeOnboarding} loading={loading} />;
      case 'partner_signup': return <PartnerSignupStep onBack={() => setStep('welcome')} onRegister={handlePartnerSignup} loading={loading} />;
      default: return <WelcomeStep onGoTo={setStep} />;
    }
  };

  const isProfileStep = profileSteps.includes(step);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      {isProfileStep && (
        <>
          <View style={styles.header}>
            <Pressable onPress={() => {
              const idx = profileSteps.indexOf(step);
              if (idx === 0) setStep('welcome');
              else setStep(profileSteps[idx - 1]);
            }} style={styles.backButton}>
              <ChevronLeft color={colors.textMuted} size={24} />
            </Pressable>
            <Text style={styles.stepText}>{t('step_x_of_y', { step: profileSteps.indexOf(step) + 1, total: profileSteps.length })}</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </>
      )}
      {renderStep()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  progressTrack: { height: 4, backgroundColor: '#f1f5f9', marginHorizontal: 20, borderRadius: 999 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 999 },
});

export default AuthFlowScreen;
