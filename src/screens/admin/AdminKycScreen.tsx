import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../../data/mock';
import { apiRequest } from '../../lib/api';

type KycReviewStatus = 'ALL' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

type AdminKycRequest = {
  id: string;
  user_id: string;
  document_type: string;
  status: Exclude<KycReviewStatus, 'ALL'>;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    is_verified: boolean;
    is_premium: boolean;
    suspended_at: string | null;
    photo: string | null;
  };
};

const STATUS_FILTERS: Array<{ value: KycReviewStatus; label: string }> = [
  { value: 'ALL', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'IN_REVIEW', label: 'En revue' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'REJECTED', label: 'Rejetés' },
];

const documentTypeLabel = (value: string) => {
  if (value === 'NATIONAL_ID' || value === 'ID_CARD') return 'Carte nationale';
  if (value === 'PASSPORT') return 'Passeport';
  if (value === 'DRIVER_LICENSE' || value === 'DRIVERS_LICENSE') return 'Permis de conduire';
  if (value === 'OTHER') return 'Autre';
  return value;
};

const statusLabel = (value: string) => {
  if (value === 'PENDING') return 'En attente';
  if (value === 'IN_REVIEW') return 'En revue';
  if (value === 'APPROVED') return 'Approuvé';
  if (value === 'REJECTED') return 'Rejeté';
  return value;
};

const AdminKycScreen: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<KycReviewStatus>('PENDING');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AdminKycRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [targetRejectRequest, setTargetRejectRequest] = useState<AdminKycRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = useCallback(async (filter = statusFilter) => {
    try {
      setLoading(true);
      const query = filter === 'ALL' ? '' : `?status=${encodeURIComponent(filter)}`;
      const response = await apiRequest<{ requests: AdminKycRequest[] }>(
        `/api/admin/kyc/requests${query}`,
        { requireAuth: true }
      );
      setRequests(response.requests || []);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de charger les demandes KYC.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchRequests(statusFilter);
  }, [statusFilter, fetchRequests]);

  const reviewRequest = async (requestId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      setProcessingId(requestId);
      await apiRequest('/api/admin/kyc/requests/' + requestId + '/review', {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          decision,
          reason: reason || null,
        }),
      });
      await fetchRequests(statusFilter);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de traiter la demande.');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmApprove = (request: AdminKycRequest) => {
    Alert.alert(
      'Approuver la vérification',
      `Confirmer la validation de ${request.user.name || request.user.email || request.user_id} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: () => { void reviewRequest(request.id, 'APPROVED'); },
        },
      ]
    );
  };

  const openRejectModal = (request: AdminKycRequest) => {
    setTargetRejectRequest(request);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const submitReject = async () => {
    if (!targetRejectRequest) return;
    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert('Motif requis', 'Saisissez un motif de rejet.');
      return;
    }
    await reviewRequest(targetRejectRequest.id, 'REJECTED', reason);
    setRejectModalVisible(false);
    setTargetRejectRequest(null);
    setRejectReason('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Revues KYC</Text>
          <Pressable style={styles.refreshButton} onPress={() => void fetchRequests(statusFilter)}>
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Validation manuelle des identités utilisateurs.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {STATUS_FILTERS.map((filter) => {
            const selected = filter.value === statusFilter;
            return (
              <Pressable
                key={filter.value}
                style={[styles.filterChip, selected && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter.value)}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? <Text style={styles.loading}>Chargement...</Text> : null}
        {!loading && requests.length === 0 ? (
          <Text style={styles.empty}>Aucune demande KYC pour ce filtre.</Text>
        ) : null}

        <View style={styles.list}>
          {requests.map((request) => {
            const isActionable = request.status === 'PENDING' || request.status === 'IN_REVIEW';
            return (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.userName}>{request.user.name || 'Utilisateur'}</Text>
                    <Text style={styles.userMeta}>{request.user.email || request.user_id}</Text>
                    <Text style={styles.userMeta}>
                      {documentTypeLabel(request.document_type)} • {statusLabel(request.status)}
                    </Text>
                    <Text style={styles.userMeta}>
                      Soumis le {new Date(request.submitted_at).toLocaleString('fr-FR')}
                    </Text>
                  </View>
                  <View style={styles.badges}>
                    {request.user.is_premium ? <Text style={[styles.badge, styles.badgePremium]}>PREMIUM</Text> : null}
                    {request.user.is_verified ? <Text style={[styles.badge, styles.badgeVerified]}>VERIFIE</Text> : null}
                  </View>
                </View>

                <View style={styles.imagesRow}>
                  {request.document_front_url ? (
                    <Image source={{ uri: request.document_front_url }} style={styles.kycImage} />
                  ) : (
                    <View style={styles.kycImageFallback}><Text style={styles.kycImageFallbackText}>Recto</Text></View>
                  )}
                  {request.selfie_url ? (
                    <Image source={{ uri: request.selfie_url }} style={styles.kycImage} />
                  ) : (
                    <View style={styles.kycImageFallback}><Text style={styles.kycImageFallbackText}>Selfie</Text></View>
                  )}
                  {request.document_back_url ? (
                    <Image source={{ uri: request.document_back_url }} style={styles.kycImage} />
                  ) : (
                    <View style={styles.kycImageFallback}><Text style={styles.kycImageFallbackText}>Verso</Text></View>
                  )}
                </View>

                {request.rejection_reason ? (
                  <Text style={styles.rejectionText}>Motif de rejet: {request.rejection_reason}</Text>
                ) : null}

                {isActionable ? (
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionButton, styles.approveButton]}
                      disabled={processingId === request.id}
                      onPress={() => confirmApprove(request)}
                    >
                      <Text style={styles.actionButtonText}>Approuver</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.rejectButton]}
                      disabled={processingId === request.id}
                      onPress={() => openRejectModal(request)}
                    >
                      <Text style={styles.actionButtonText}>Rejeter</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal transparent visible={rejectModalVisible} animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Motif de rejet</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: document flou, incohérence selfie/pièce..."
              style={styles.modalInput}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={() => void submitReject()}>
                <Text style={styles.modalConfirmText}>Confirmer le rejet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.muted,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  refreshButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  filtersRow: {
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#7dd3fc',
    backgroundColor: '#e0f2fe',
  },
  filterChipText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#0369a1',
  },
  loading: {
    color: COLORS.muted,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  userMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgePremium: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
  },
  badgeVerified: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kycImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  kycImageFallback: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycImageFallbackText: {
    color: COLORS.muted,
    fontWeight: '700',
    fontSize: 11,
  },
  rejectionText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#15803d',
  },
  rejectButton: {
    backgroundColor: '#b91c1c',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    color: COLORS.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  modalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.ink,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  modalConfirm: {
    backgroundColor: '#b91c1c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalConfirmText: {
    color: '#fff',
    fontWeight: '800',
  },
});

export default AdminKycScreen;
