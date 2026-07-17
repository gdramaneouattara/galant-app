import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Star, X } from 'lucide-react-native';
import { COLORS } from '../data/mock';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: { score: number; category: string; comment: string }) => void;
  loading?: boolean;
  userName?: string;
}

const CATEGORIES = [
  { id: 'RESPECTFUL', label: 'Très respectueux' },
  { id: 'GENTLEMAN', label: 'Vrai Gentleman' },
  { id: 'REACTIVE', label: 'Réactif' },
  { id: 'FUN', label: 'Amusant' },
  { id: 'DISAPPOINTING', label: 'Décevant' },
];

const GalanterieRatingModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  loading,
  userName
}) => {
  const [score, setScore] = useState(5);
  const [category, setCategory] = useState('RESPECTFUL');
  const [comment, setComment] = useState('');

  const renderStars = () => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Pressable key={s} onPress={() => setScore(s)}>
            <Star
              size={32}
              color={s <= score ? '#fbbf24' : '#e2e8f0'}
              fill={s <= score ? '#fbbf24' : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Indice de Galanterie</Text>
            <Pressable onPress={onClose} disabled={loading}>
              <X color={COLORS.muted} size={24} />
            </Pressable>
          </View>

          <Text style={styles.description}>
            Comment s'est passée votre interaction avec <Text style={styles.highlight}>{userName || 'cet utilisateur'}</Text> ? Votre avis aide à maintenir une communauté de qualité.
          </Text>

          {renderStars()}

          <View style={styles.categories}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Un petit commentaire ? (optionnel)"
            placeholderTextColor={COLORS.muted}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={200}
          />

          <Pressable
            style={[styles.submitBtn, loading && styles.disabledBtn]}
            onPress={() => onSubmit({ score, category, comment })}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Valider l'évaluation</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.ink },
  description: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  highlight: { color: COLORS.primary, fontWeight: 'bold' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 10 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  categoryChipActive: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  categoryText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  categoryTextActive: { color: '#e11d48' },
  commentInput: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, fontSize: 14, color: COLORS.ink, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0' },
  submitBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabledBtn: { opacity: 0.7 },
});

export default GalanterieRatingModal;
