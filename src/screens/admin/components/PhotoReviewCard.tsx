import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../../data/mock';

interface PhotoReviewCardProps {
  review: any;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED') => void;
}

const PhotoReviewCard: React.FC<PhotoReviewCardProps> = ({ review, onReview }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Photo à vérifier</Text>
      {review.user && <Text style={styles.cardMeta}>User: {review.user.email || review.user.name}</Text>}
      <Image source={{ uri: review.photo_url }} style={styles.photoPreview} />
      {review.auto_flags?.length ? <Text style={styles.cardMeta}>Flags: {review.auto_flags.join(', ')}</Text> : null}
      <Text style={styles.cardMeta}>Date: {new Date(review.created_at).toLocaleString('fr-FR')}</Text>
      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionButton, styles.actionResolve]} onPress={() => onReview(review.id, 'APPROVED')}>
          <Text style={[styles.actionButtonText, styles.actionResolveText]}>Approuver</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionDismiss]} onPress={() => onReview(review.id, 'REJECTED')}>
          <Text style={[styles.actionButtonText, styles.actionDismissText]}>Rejeter</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, gap: 4 },
  cardTitle: { color: COLORS.ink, fontWeight: '800' },
  cardMeta: { color: COLORS.muted, fontSize: 12 },
  photoPreview: { width: '100%', height: 180, borderRadius: 12, marginTop: 6 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  actionButton: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionButtonText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  actionResolve: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  actionResolveText: { color: '#166534' },
  actionDismiss: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionDismissText: { color: '#b91c1c' },
});

export default PhotoReviewCard;
