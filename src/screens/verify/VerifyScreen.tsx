import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ShieldCheck } from 'lucide-react-native';
import { COLORS } from '../../data/mock';
import { useApp } from '../../state/AppContext';
import { apiRequest } from '../../lib/api';
import { supabase } from '../../lib/supabase';

type KycStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

type KycRequest = {
  id: string;
  status: KycStatus;
  document_type: string;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  metadata?: Record<string, unknown>;
};

type KycMeResponse = {
  is_verified: boolean;
  current: KycRequest | null;
  history: KycRequest[];
};

const DOCUMENT_TYPES = [
  { value: 'NATIONAL_ID', label: 'Carte nationale' },
  { value: 'PASSPORT', label: 'Passeport' },
  { value: 'DRIVER_LICENSE', label: 'Permis de conduire' },
  { value: 'OTHER', label: 'Autre document' },
];

const normalizeError = (message?: string) => {
  if (!message) return 'Impossible de soumettre la vérification.';
  if (message === 'kyc_request_already_open') {
    return 'Une demande est déjà en cours. Patientez le temps de la revue admin.';
  }
  if (message === 'already_verified') {
    return 'Votre compte est déjà vérifié.';
  }
  if (message === 'invalid_document_paths') {
    return 'Les fichiers uploadés sont invalides. Réessayez.';
  }
  if (message === 'missing_required_documents') {
    return 'La pièce (recto) et le selfie sont requis.';
  }
  if (message === 'kyc_not_initialized') {
    return 'Le module KYC n’est pas encore initialisé côté serveur.';
  }
  if (message === 'selfie_live_capture_required') {
    return 'Le selfie doit être capturé en direct avec la caméra.';
  }
  if (message === 'invalid_selfie_capture_timestamp' || message === 'selfie_capture_too_old') {
    return 'Le selfie doit être récent. Reprenez une photo en direct.';
  }
  return message;
};

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
  const [documentType, setDocumentType] = useState('NATIONAL_ID');
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
      Alert.alert('Erreur', normalizeError(error?.message));
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission refusée', "Autorisez l'accès à la galerie pour importer vos justificatifs.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setter(result.assets[0].uri);
    }
  };

  const captureSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission refusée', "Autorisez l'accès à la caméra pour capturer un selfie live.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelfieUri(result.assets[0].uri);
      setSelfieCapturedAt(new Date().toISOString());
    }
  };

  const uploadImageToKycBucket = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = (uri.split('.').pop() || 'jpg').toLowerCase();
    const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage.from('kyc-docs').upload(path, blob, {
      upsert: false,
      contentType,
    });

    if (error) throw error;
  };

  const canSubmit = useMemo(() => {
    if (!currentUser) return false;
    if (loadingState || submitting) return false;
    if (!documentFrontUri || !selfieUri || !selfieCapturedAt) return false;
    const currentStatus = kycData?.current?.status;
    if (currentStatus === 'PENDING' || currentStatus === 'IN_REVIEW') return false;
    return !currentUser.isVerified;
  }, [
    currentUser,
    loadingState,
    submitting,
    documentFrontUri,
    selfieUri,
    selfieCapturedAt,
    kycData?.current?.status,
  ]);

  const submitKyc = async () => {
    if (!currentUser) return;
    if (!documentFrontUri || !selfieUri || !selfieCapturedAt) {
      Alert.alert('Pièces manquantes', 'Ajoutez le recto de la pièce et capturez un selfie live.');
      return;
    }

    try {
      setSubmitting(true);
      const folder = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const frontPath = `${folder}/document_front.jpg`;
      const backPath = documentBackUri ? `${folder}/document_back.jpg` : null;
      const selfiePath = `${folder}/selfie_live.jpg`;

      await uploadImageToKycBucket(documentFrontUri, frontPath);
      if (documentBackUri) {
        await uploadImageToKycBucket(documentBackUri, backPath!);
      }
      await uploadImageToKycBucket(selfieUri, selfiePath);

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

      setDocumentFrontUri(null);
      setDocumentBackUri(null);
      setSelfieUri(null);
      setSelfieCapturedAt(null);
      await fetchKycState();
      Alert.alert('Demande envoyée', 'Votre dossier KYC est transmis à l’administration.');
    } catch (error: any) {
      Alert.alert('Erreur', normalizeError(error?.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentUser) return null;

  if (currentUser.isVerified || kycData?.is_verified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <View style={styles.icon}>
            <ShieldCheck color="#16a34a" size={52} />
          </View>
          <Text style={styles.title}>Identité vérifiée</Text>
          <Text style={styles.subtitle}>Votre vérification KYC est validée.</Text>
          <Pressable style={styles.primary} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryLabel}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Vérification d’identité</Text>
        <Text style={styles.subtitle}>
          Transmettez votre pièce d’identité et un selfie live pour validation manuelle par l’admin.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Statut actuel</Text>
          <Text style={styles.statusValue}>
            {loadingState ? 'Chargement...' : getStatusLabel(kycData?.current?.status)}
          </Text>
          {kycData?.current?.submitted_at ? (
            <Text style={styles.statusHint}>
              Soumis le {new Date(kycData.current.submitted_at).toLocaleString('fr-FR')}
            </Text>
          ) : null}
          {kycData?.current?.status === 'REJECTED' && kycData.current.rejection_reason ? (
            <Text style={styles.rejectionText}>Motif: {kycData.current.rejection_reason}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Type de document</Text>
        <View style={styles.chips}>
          {DOCUMENT_TYPES.map((item) => {
            const selected = documentType === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setDocumentType(item.value)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Pièces requises</Text>
        <Pressable style={styles.fileButton} onPress={() => void pickImage(setDocumentFrontUri)}>
          <Text style={styles.fileButtonLabel}>
            {documentFrontUri ? 'Recto sélectionné' : 'Ajouter recto de la pièce'}
          </Text>
        </Pressable>
        <Pressable style={styles.fileButton} onPress={() => void pickImage(setDocumentBackUri)}>
          <Text style={styles.fileButtonLabel}>
            {documentBackUri ? 'Verso sélectionné' : 'Ajouter verso (optionnel)'}
          </Text>
        </Pressable>
        <Pressable style={styles.fileButton} onPress={() => void captureSelfie()}>
          <Text style={styles.fileButtonLabel}>
            {selfieUri ? 'Selfie live capturé' : 'Capturer selfie live (obligatoire)'}
          </Text>
        </Pressable>
        <Text style={styles.selfieHint}>
          Le selfie doit être pris en direct avec la caméra pour limiter l’usurpation.
        </Text>

        <Pressable
          style={[styles.primary, !canSubmit && styles.primaryDisabled]}
          disabled={!canSubmit}
          onPress={() => void submitKyc()}
        >
          <Text style={styles.primaryLabel}>{submitting ? 'Envoi...' : 'Soumettre la demande'}</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={() => void fetchKycState()}>
          <Text style={styles.secondaryLabel}>Actualiser le statut</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
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
  },
  sectionTitle: {
    marginTop: 4,
    color: COLORS.ink,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statusLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusValue: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  statusHint: {
    color: COLORS.muted,
    fontSize: 12,
  },
  rejectionText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#7dd3fc',
    backgroundColor: '#e0f2fe',
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#0369a1',
  },
  fileButton: {
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  fileButtonLabel: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  selfieHint: {
    color: '#475569',
    fontSize: 12,
    marginTop: -4,
  },
  primary: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryDisabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '800',
  },
  secondary: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  secondaryLabel: {
    color: '#475569',
    fontWeight: '700',
  },
});

export default VerifyScreen;
