import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ShieldCheck, Camera, FileText, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { uploadArrayBufferToBucket } from '../../lib/storageUpload';

type KycStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

type KycRequest = {
  id: string;
  status: KycStatus;
  document_type: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

type KycMeResponse = {
  is_verified: boolean;
  current: KycRequest | null;
  history: KycRequest[];
};

const DOCUMENT_TYPES = [
  { value: 'ID_CARD', label: 'Carte nationale' },
  { value: 'PASSPORT', label: 'Passeport' },
  { value: 'DRIVERS_LICENSE', label: 'Permis de conduire' },
];

const getStatusLabel = (status?: string) => {
  if (status === 'PENDING') return 'En attente';
  if (status === 'IN_REVIEW') return 'En revue';
  if (status === 'APPROVED') return 'Approuvée';
  if (status === 'REJECTED') return 'Rejetée';
  return 'Non soumise';
};

const VerifyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, refreshCurrentUser } = useApp();
  const [loadingState, setLoadingState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [documentType, setDocumentType] = useState('ID_CARD');
  const [documentFrontUri, setDocumentFrontUri] = useState<string | null>(null);
  const [documentBackUri, setDocumentBackUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieCapturedAt, setSelfieCapturedAt] = useState<string | null>(null);
  const [kycData, setKycData] = useState<KycMeResponse | null>(null);

  const fetchKycState = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingState(true);
      const payload = await apiRequest<KycMeResponse>('/api/kyc/me', { requireAuth: true });
      setKycData(payload);
      if (payload.is_verified && !currentUser.isVerified) {
        await refreshCurrentUser();
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoadingState(false);
    }
  }, [currentUser, refreshCurrentUser]);

  useFocusEffect(
    useCallback(() => {
      void fetchKycState();
    }, [fetchKycState])
  );

  const pickImage = async (setter: (uri: string | null) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Nous avons besoin d'accéder à vos photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setter(result.assets[0].uri);
    }
  };

  const captureSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est obligatoire pour le selfie live.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelfieUri(result.assets[0].uri);
      setSelfieCapturedAt(new Date().toISOString());
    }
  };

  const uploadToStorage = async (uri: string, path: string) => {
    await uploadArrayBufferToBucket({
      bucket: 'kyc-docs',
      path,
      uri,
      contentType: 'image/jpeg'
    });
  };

  const isBackRequired = documentType === 'ID_CARD' || documentType === 'DRIVERS_LICENSE';

  const canSubmit = useMemo(() => {
    if (submitting || loadingState) return false;
    if (!documentFrontUri || !selfieUri || !selfieCapturedAt) return false;
    if (isBackRequired && !documentBackUri) return false;
    return true;
  }, [documentFrontUri, documentBackUri, selfieUri, isBackRequired, submitting, loadingState]);

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;

    setSubmitting(true);
    try {
      const folder = `${currentUser.id}/${Date.now()}`;
      const frontPath = `${folder}/front.jpg`;
      const selfiePath = `${folder}/selfie.jpg`;
      const backPath = documentBackUri ? `${folder}/back.jpg` : null;

      await uploadToStorage(documentFrontUri!, frontPath);
      await uploadToStorage(selfieUri!, selfiePath);
      if (backPath) await uploadToStorage(documentBackUri!, backPath);

      // Quality requirement: uploadToSupabase
      await apiRequest('/api/kyc/requests', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          document_type: documentType,
          document_front_path: frontPath,
          document_back_path: backPath,
          selfie_path: selfiePath,
          selfie_capture_mode: 'CAMERA',
          selfie_captured_at: selfieCapturedAt,
        }),
      });

      Alert.alert('Succès', 'Votre demande a été envoyée. Elle sera traitée sous 24h.');
      fetchKycState();
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de l’envoi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (currentUser?.isVerified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <CheckCircle2 color="#22c55e" size={64} />
          <Text style={styles.title}>Profil Vérifié</Text>
          <Text style={styles.subtitle}>Votre identité a été confirmée avec succès.</Text>
          <Pressable style={styles.primary} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryLabel}>Retour au profil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Vérification KYC</Text>
        <Text style={styles.subtitle}>Pour garantir la sécurité de la communauté, nous devons vérifier votre identité.</Text>

        <View style={styles.statusBox}>
          <Text style={styles.label}>Statut : <Text style={styles.statusText}>{getStatusLabel(kycData?.current?.status)}</Text></Text>
          {kycData?.current?.rejection_reason && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#ef4444" />
              <Text style={styles.errorText}>{kycData.current.rejection_reason}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>1. Type de document</Text>
        <View style={styles.chips}>
          {DOCUMENT_TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => setDocumentType(t.value)}
              style={[styles.chip, documentType === t.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, documentType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>2. Photos du document</Text>
        <View style={styles.row}>
          <Pressable style={[styles.photoBtn, documentFrontUri && styles.photoBtnDone]} onPress={() => pickImage(setDocumentFrontUri)}>
            <FileText size={24} color={documentFrontUri ? '#22c55e' : COLORS.muted} />
            <Text style={styles.photoBtnLabel}>{documentFrontUri ? 'Recto OK' : 'Recto (obligatoire)'}</Text>
          </Pressable>

          <Pressable
            style={[styles.photoBtn, documentBackUri && styles.photoBtnDone, !isBackRequired && { opacity: 0.5 }]}
            onPress={() => pickImage(setDocumentBackUri)}
          >
            <FileText size={24} color={documentBackUri ? '#22c55e' : COLORS.muted} />
            <Text style={styles.photoBtnLabel}>{documentBackUri ? 'Verso OK' : (isBackRequired ? 'Verso (obligatoire)' : 'Verso (facultatif)')}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>3. Preuve de présence</Text>
        <Pressable style={[styles.photoBtn, styles.fullWidth, selfieUri && styles.photoBtnDone]} onPress={captureSelfie}>
          <Camera size={24} color={selfieUri ? '#22c55e' : COLORS.muted} />
          <Text style={styles.photoBtnLabel}>{selfieUri ? 'Selfie live capturé' : 'Capturer un Selfie Live'}</Text>
        </Pressable>
        <Text style={styles.infoText}>⚠️ Le selfie doit être pris instantanément avec votre caméra frontale.</Text>

        <Pressable
          style={[styles.primary, !canSubmit && styles.primaryDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryLabel}>Soumettre le dossier</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, gap: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.ink },
  subtitle: { fontSize: 15, color: COLORS.muted, lineHeight: 22 },
  statusBox: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontWeight: '700', color: COLORS.ink },
  statusText: { color: COLORS.primary },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8 },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, height: 100, backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoBtnDone: { borderStyle: 'solid', borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  photoBtnLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textAlign: 'center' },
  fullWidth: { width: '100%' },
  infoText: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic' },
  primary: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  primaryDisabled: { backgroundColor: '#cbd5e1' },
  primaryLabel: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default VerifyScreen;
