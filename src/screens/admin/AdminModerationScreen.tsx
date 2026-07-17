import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../lib/api';
import { COLORS } from '../../data/mock';

// Components
import ReportCard from './components/ReportCard';
import PrivacyCard from './components/PrivacyCard';
import PhotoReviewCard from './components/PhotoReviewCard';

type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

const REPORT_STATUS_FILTERS: Array<{ value: 'ALL' | ReportStatus; label: string }> = [
  { value: 'ALL', label: 'Tous' },
  { value: 'OPEN', label: 'Ouverts' },
  { value: 'IN_REVIEW', label: 'En revue' },
  { value: 'RESOLVED', label: 'Résolus' },
  { value: 'DISMISSED', label: 'Rejetés' },
];

const AdminModerationScreen: React.FC = () => {
  const [reportFilter, setReportFilter] = useState<'ALL' | ReportStatus>('OPEN');
  const [reports, setReports] = useState<any[]>([]);
  const [privacyRequests, setPrivacyRequests] = useState<any[]>([]);
  const [photoReviews, setPhotoReviews] = useState<any[]>([]);
  const [photoPage, setPhotoPage] = useState(1);
  const [photoHasMore, setPhotoHasMore] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPhotoReviews = useCallback(async (page = 1, mode: 'replace' | 'append' = 'replace') => {
    try {
      setLoadingPhotos(true);
      const res = await apiRequest<any>(`/api/admin/photo-reviews?status=PENDING&limit=50&page=${page}`, { requireAuth: true });
      setPhotoReviews(prev => mode === 'append' ? [...prev, ...(res.reviews || [])] : (res.reviews || []));
      setPhotoPage(res.page || page);
      setPhotoHasMore(res.hasMore === true);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setLoadingPhotos(false); }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const reportQuery = reportFilter === 'ALL' ? '' : `?status=${reportFilter}`;
      const [reportsRes, privacyRes] = await Promise.all([
        apiRequest<any>(`/api/admin/reports${reportQuery}`, { requireAuth: true }),
        apiRequest<any>('/api/admin/privacy-requests?limit=100', { requireAuth: true }),
      ]);
      setReports(reportsRes.reports || []);
      setPrivacyRequests(privacyRes.requests || []);
      await fetchPhotoReviews(1, 'replace');
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
  }, [reportFilter, fetchPhotoReviews]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleReviewReport = async (id: string, status: ReportStatus, opts?: any) => {
    try {
      await apiRequest(`/api/admin/reports/${id}/review`, { method: 'POST', requireAuth: true, body: JSON.stringify({ status, adminNote: `Traité (${status})`, suspendReportedUser: opts?.suspend, removeMessageContent: opts?.removeMessage }) });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  };

  const handleResolvePrivacy = async (id: string, status: string, executeDelete = false) => {
    try {
      await apiRequest(`/api/admin/privacy-requests/${id}/resolve`, { method: 'POST', requireAuth: true, body: JSON.stringify({ status, note: `Traité: ${status}`, executeDelete }) });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  };

  const handleReviewPhoto = async (id: string, status: string) => {
    try {
      await apiRequest(`/api/admin/photo-reviews/${id}/review`, { method: 'POST', requireAuth: true, body: JSON.stringify({ status, note: `Traité (${status})` }) });
      void fetchData();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Modération & RGPD</Text>
          <Pressable style={styles.refreshBtn} onPress={() => void fetchData()}><Text style={styles.refreshBtnText}>Actualiser</Text></Pressable>
        </View>

        <Text style={styles.sectionTitle}>Signalements</Text>
        <View style={styles.filterRow}>
          {REPORT_STATUS_FILTERS.map(item => (
            <Pressable key={item.value} style={[styles.filterChip, reportFilter === item.value && styles.filterChipActive]} onPress={() => setReportFilter(item.value)}>
              <Text style={[styles.filterChipText, reportFilter === item.value && styles.filterChipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? <Text style={styles.loadingText}>Chargement...</Text> : (
          <View style={styles.list}>
            {reports.length === 0 ? <Text style={styles.emptyText}>Aucun signalement.</Text> : reports.map(r => <ReportCard key={r.id} report={r} onReview={handleReviewReport} />)}
          </View>
        )}

        <Text style={styles.sectionTitle}>RGPD</Text>
        <View style={styles.list}>
          {privacyRequests.length === 0 ? <Text style={styles.emptyText}>Aucune demande.</Text> : privacyRequests.map(p => <PrivacyCard key={p.id} request={p} onResolve={handleResolvePrivacy} />)}
        </View>

        <Text style={styles.sectionTitle}>Photos en revue</Text>
        <View style={styles.list}>
          {photoReviews.length === 0 ? <Text style={styles.emptyText}>Aucune photo.</Text> : photoReviews.map(p => <PhotoReviewCard key={p.id} review={p} onReview={handleReviewPhoto} />)}
          {photoHasMore && <Pressable style={styles.loadMoreBtn} onPress={() => void fetchPhotoReviews(photoPage + 1, 'append')} disabled={loadingPhotos}><Text style={styles.loadMoreBtnText}>{loadingPhotos ? '...' : 'Charger plus'}</Text></Pressable>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.ink },
  refreshBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6 },
  refreshBtnText: { color: COLORS.ink, fontWeight: '700' },
  sectionTitle: { marginTop: 8, color: COLORS.ink, fontWeight: '800', fontSize: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  filterChipActive: { borderColor: '#7dd3fc', backgroundColor: '#e0f2fe' },
  filterChipText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#0369a1' },
  loadingText: { color: COLORS.muted },
  emptyText: { color: COLORS.muted },
  list: { gap: 8 },
  loadMoreBtn: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginTop: 6 },
  loadMoreBtnText: { color: COLORS.ink, fontWeight: '700' },
});

export default AdminModerationScreen;
