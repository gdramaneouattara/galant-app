import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';

type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
type PrivacyStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
type PhotoReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type AdminReport = {
  id: string;
  status: ReportStatus;
  category: string;
  target_type: string;
  description: string;
  created_at: string;
  reporter: { id: string; name: string; email: string | null } | null;
  reported_user: { id: string; name: string; email: string | null } | null;
};

type PrivacyRequest = {
  id: string;
  user_id: string;
  request_type: 'EXPORT' | 'DELETE';
  status: PrivacyStatus;
  details: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
};

type PhotoReview = {
  id: string;
  user_id: string;
  photo_url: string;
  status: PhotoReviewStatus;
  auto_flags?: string[];
  created_at: string;
  user: { id: string; name: string; email: string | null } | null;
};

const REPORT_STATUS_FILTERS: Array<{ value: 'ALL' | ReportStatus; label: string }> = [
  { value: 'ALL', label: 'Tous' },
  { value: 'OPEN', label: 'Ouverts' },
  { value: 'IN_REVIEW', label: 'En revue' },
  { value: 'RESOLVED', label: 'Résolus' },
  { value: 'DISMISSED', label: 'Rejetés' },
];

const AdminModerationScreen: React.FC = () => {
  const [reportFilter, setReportFilter] = useState<'ALL' | ReportStatus>('OPEN');
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequest[]>([]);
  const [photoReviews, setPhotoReviews] = useState<PhotoReview[]>([]);
  const [photoPage, setPhotoPage] = useState(1);
  const [photoHasMore, setPhotoHasMore] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPhotoReviews = useCallback(async (page = 1, mode: 'replace' | 'append' = 'replace') => {
    try {
      setLoadingPhotos(true);
      const response = await apiRequest<{
        reviews: PhotoReview[];
        page: number;
        hasMore: boolean;
      }>(`/api/admin/photo-reviews?status=PENDING&limit=50&page=${page}`, { requireAuth: true });

      setPhotoReviews((prev) => (
        mode === 'append' ? [...prev, ...(response.reviews || [])] : (response.reviews || [])
      ));
      setPhotoPage(response.page || page);
      setPhotoHasMore(response.hasMore === true);
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de charger les photos en revue.');
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const reportQuery = reportFilter === 'ALL' ? '' : `?status=${reportFilter}`;
      const [reportsResponse, privacyResponse] = await Promise.all([
        apiRequest<{ reports: AdminReport[] }>(`/api/admin/reports${reportQuery}`, { requireAuth: true }),
        apiRequest<{ requests: PrivacyRequest[] }>('/api/admin/privacy-requests?limit=100', { requireAuth: true }),
      ]);
      setReports(reportsResponse.reports || []);
      setPrivacyRequests(privacyResponse.requests || []);
      await fetchPhotoReviews(1, 'replace');
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de charger la modération.');
    } finally {
      setLoading(false);
    }
  }, [reportFilter, fetchPhotoReviews]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const reviewReport = async (reportId: string, status: ReportStatus, options?: { suspend?: boolean; removeMessage?: boolean }) => {
    try {
      await apiRequest(`/api/admin/reports/${reportId}/review`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          status,
          adminNote: `Traité via AdminModerationScreen (${status})`,
          suspendReportedUser: options?.suspend === true,
          removeMessageContent: options?.removeMessage === true,
        }),
      });
      await fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de traiter ce signalement.');
    }
  };

  const resolvePrivacy = async (
    id: string,
    status: 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED',
    executeDelete = false
  ) => {
    try {
      await apiRequest(`/api/admin/privacy-requests/${id}/resolve`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          status,
          note: `Mis à jour via AdminModerationScreen: ${status}`,
          executeDelete,
        }),
      });
      await fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de traiter cette demande RGPD.');
    }
  };

  const reviewPhoto = async (reviewId: string, status: PhotoReviewStatus) => {
    try {
      await apiRequest(`/api/admin/photo-reviews/${reviewId}/review`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          status,
          note: `Traité via AdminModerationScreen (${status})`,
        }),
      });
      await fetchData();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Impossible de traiter cette photo.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Modération & RGPD</Text>
          <Pressable style={styles.refreshButton} onPress={() => void fetchData()}>
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Signalements utilisateurs</Text>
        <View style={styles.filterRow}>
          {REPORT_STATUS_FILTERS.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.filterChip, reportFilter === item.value && styles.filterChipActive]}
              onPress={() => setReportFilter(item.value)}
            >
              <Text style={[styles.filterChipText, reportFilter === item.value && styles.filterChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? <Text style={styles.loadingText}>Chargement...</Text> : null}

        {!loading && reports.length === 0 ? (
          <Text style={styles.emptyText}>Aucun signalement pour ce filtre.</Text>
        ) : (
          <View style={styles.list}>
            {reports.map((report) => (
              <View key={report.id} style={styles.card}>
                <Text style={styles.cardTitle}>{report.category} • {report.status}</Text>
                <Text style={styles.cardMeta}>Type: {report.target_type}</Text>
                <Text style={styles.cardMeta}>Reporter: {report.reporter?.email || report.reporter?.name || 'Inconnu'}</Text>
                <Text style={styles.cardMeta}>Signalé: {report.reported_user?.email || report.reported_user?.name || 'N/A'}</Text>
                <Text style={styles.cardDescription}>{report.description}</Text>
                <Text style={styles.cardMeta}>Date: {new Date(report.created_at).toLocaleString('fr-FR')}</Text>

                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionButton} onPress={() => void reviewReport(report.id, 'IN_REVIEW')}>
                    <Text style={styles.actionButtonText}>En revue</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.actionResolve]} onPress={() => void reviewReport(report.id, 'RESOLVED')}>
                    <Text style={[styles.actionButtonText, styles.actionResolveText]}>Résoudre</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.actionDismiss]} onPress={() => void reviewReport(report.id, 'DISMISSED')}>
                    <Text style={[styles.actionButtonText, styles.actionDismissText]}>Rejeter</Text>
                  </Pressable>
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionButton, styles.actionSuspend]}
                    onPress={() => void reviewReport(report.id, 'RESOLVED', { suspend: true })}
                  >
                    <Text style={[styles.actionButtonText, styles.actionSuspendText]}>Résoudre + Suspendre</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.actionModerate]}
                    onPress={() => void reviewReport(report.id, 'RESOLVED', { removeMessage: true })}
                  >
                    <Text style={[styles.actionButtonText, styles.actionModerateText]}>Résoudre + Retirer contenu</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Demandes confidentialité (RGPD)</Text>
        {privacyRequests.length === 0 ? (
          <Text style={styles.emptyText}>Aucune demande RGPD.</Text>
        ) : (
          <View style={styles.list}>
            {privacyRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <Text style={styles.cardTitle}>{request.request_type} • {request.status}</Text>
                <Text style={styles.cardMeta}>User: {request.user_id}</Text>
                <Text style={styles.cardMeta}>Créée: {new Date(request.created_at).toLocaleString('fr-FR')}</Text>
                {request.resolved_at ? (
                  <Text style={styles.cardMeta}>Résolue: {new Date(request.resolved_at).toLocaleString('fr-FR')}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionButton} onPress={() => void resolvePrivacy(request.id, 'IN_PROGRESS')}>
                    <Text style={styles.actionButtonText}>En cours</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.actionResolve]}
                    onPress={() => void resolvePrivacy(request.id, 'RESOLVED', request.request_type === 'DELETE')}
                  >
                    <Text style={[styles.actionButtonText, styles.actionResolveText]}>Résolue</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.actionDismiss]} onPress={() => void resolvePrivacy(request.id, 'REJECTED')}>
                    <Text style={[styles.actionButtonText, styles.actionDismissText]}>Rejetée</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Photos en revue</Text>
        {loadingPhotos && photoReviews.length === 0 ? (
          <Text style={styles.emptyText}>Chargement...</Text>
        ) : photoReviews.length === 0 ? (
          <Text style={styles.emptyText}>Aucune photo en attente.</Text>
        ) : (
          <View style={styles.list}>
            {photoReviews.map((review) => (
              <View key={review.id} style={styles.card}>
                <Text style={styles.cardTitle}>Photo à vérifier</Text>
                {review.user ? (
                  <Text style={styles.cardMeta}>User: {review.user.email || review.user.name}</Text>
                ) : null}
                <Image source={{ uri: review.photo_url }} style={styles.photoPreview} />
                {review.auto_flags?.length ? (
                  <Text style={styles.cardMeta}>Flags: {review.auto_flags.join(', ')}</Text>
                ) : null}
                <Text style={styles.cardMeta}>Date: {new Date(review.created_at).toLocaleString('fr-FR')}</Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.actionButton, styles.actionResolve]}
                    onPress={() => void reviewPhoto(review.id, 'APPROVED')}
                  >
                    <Text style={[styles.actionButtonText, styles.actionResolveText]}>Approuver</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.actionDismiss]}
                    onPress={() => void reviewPhoto(review.id, 'REJECTED')}
                  >
                    <Text style={[styles.actionButtonText, styles.actionDismissText]}>Rejeter</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {photoHasMore ? (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => void fetchPhotoReviews(photoPage + 1, 'append')}
                disabled={loadingPhotos}
              >
                <Text style={styles.loadMoreButtonText}>
                  {loadingPhotos ? 'Chargement...' : 'Charger plus'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.ink,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 8,
    color: COLORS.ink,
    fontWeight: '800',
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: '#7dd3fc',
    backgroundColor: '#e0f2fe',
  },
  filterChipText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#0369a1',
  },
  loadingText: {
    color: COLORS.muted,
  },
  emptyText: {
    color: COLORS.muted,
  },
  list: {
    gap: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  cardDescription: {
    color: COLORS.ink,
    marginTop: 2,
    marginBottom: 2,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionButtonText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  actionResolve: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  actionResolveText: {
    color: '#166534',
  },
  actionDismiss: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  actionDismissText: {
    color: '#b91c1c',
  },
  actionSuspend: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
  },
  actionSuspendText: {
    color: '#be123c',
  },
  actionModerate: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  actionModerateText: {
    color: '#c2410c',
  },
  loadMoreButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  loadMoreButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
});

export default AdminModerationScreen;
