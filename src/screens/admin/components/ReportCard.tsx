import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../../data/mock';

type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

interface ReportCardProps {
  report: any;
  onReview: (id: string, status: ReportStatus, options?: { suspend?: boolean; removeMessage?: boolean }) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onReview }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{report.category} • {report.status}</Text>
      <Text style={styles.cardMeta}>Type: {report.target_type}</Text>
      <Text style={styles.cardMeta}>Reporter: {report.reporter?.email || report.reporter?.name || 'Inconnu'}</Text>
      <Text style={styles.cardMeta}>Signalé: {report.reported_user?.email || report.reported_user?.name || 'N/A'}</Text>
      <Text style={styles.cardDescription}>{report.description}</Text>
      <Text style={styles.cardMeta}>Date: {new Date(report.created_at).toLocaleString('fr-FR')}</Text>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={() => onReview(report.id, 'IN_REVIEW')}>
          <Text style={styles.actionButtonText}>En revue</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionResolve]} onPress={() => onReview(report.id, 'RESOLVED')}>
          <Text style={[styles.actionButtonText, styles.actionResolveText]}>Résoudre</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionDismiss]} onPress={() => onReview(report.id, 'DISMISSED')}>
          <Text style={[styles.actionButtonText, styles.actionDismissText]}>Rejeter</Text>
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionButton, styles.actionSuspend]} onPress={() => onReview(report.id, 'RESOLVED', { suspend: true })}>
          <Text style={[styles.actionButtonText, styles.actionSuspendText]}>Résoudre + Suspendre</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionModerate]} onPress={() => onReview(report.id, 'RESOLVED', { removeMessage: true })}>
          <Text style={[styles.actionButtonText, styles.actionModerateText]}>Résoudre + Retirer contenu</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, gap: 4 },
  cardTitle: { color: COLORS.ink, fontWeight: '800' },
  cardMeta: { color: COLORS.muted, fontSize: 12 },
  cardDescription: { color: COLORS.ink, marginTop: 2, marginBottom: 2 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  actionButton: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionButtonText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  actionResolve: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  actionResolveText: { color: '#166534' },
  actionDismiss: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionDismissText: { color: '#b91c1c' },
  actionSuspend: { borderColor: '#fca5a5', backgroundColor: '#fff1f2' },
  actionSuspendText: { color: '#be123c' },
  actionModerate: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  actionModerateText: { color: '#c2410c' },
});

export default ReportCard;
