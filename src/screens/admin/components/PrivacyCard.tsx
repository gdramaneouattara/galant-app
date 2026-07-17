import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../../data/mock';

interface PrivacyCardProps {
  request: any;
  onResolve: (id: string, status: 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED', executeDelete: boolean) => void;
}

const PrivacyCard: React.FC<PrivacyCardProps> = ({ request, onResolve }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{request.request_type} • {request.status}</Text>
      <Text style={styles.cardMeta}>User: {request.user_id}</Text>
      <Text style={styles.cardMeta}>Créée: {new Date(request.created_at).toLocaleString('fr-FR')}</Text>
      {request.resolved_at && <Text style={styles.cardMeta}>Résolue: {new Date(request.resolved_at).toLocaleString('fr-FR')}</Text>}

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={() => onResolve(request.id, 'IN_PROGRESS', false)}>
          <Text style={styles.actionButtonText}>En cours</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionResolve]} onPress={() => onResolve(request.id, 'RESOLVED', request.request_type === 'DELETE')}>
          <Text style={[styles.actionButtonText, styles.actionResolveText]}>Résolue</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionDismiss]} onPress={() => onResolve(request.id, 'REJECTED', false)}>
          <Text style={[styles.actionButtonText, styles.actionDismissText]}>Rejetée</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, gap: 4 },
  cardTitle: { color: COLORS.ink, fontWeight: '800' },
  cardMeta: { color: COLORS.muted, fontSize: 12 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  actionButton: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionButtonText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  actionResolve: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  actionResolveText: { color: '#166534' },
  actionDismiss: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionDismissText: { color: '#b91c1c' },
});

export default PrivacyCard;
