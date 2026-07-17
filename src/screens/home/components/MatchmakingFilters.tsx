import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { X, CheckCircle } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

interface MatchmakingFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: any;
  setFilters: (filters: any) => void;
  colors: any;
  isPremium: boolean;
  onGoPremium: () => void;
}

const MatchmakingFilters: React.FC<MatchmakingFiltersProps> = ({
  visible,
  onClose,
  filters,
  setFilters,
  colors,
  isPremium,
  onGoPremium,
}) => {
  const handlePremiumFilter = (key: string) => {
    if (!isPremium) {
      Alert.alert(
        'Privilège Premium 💎',
        'Les filtres de standing sont réservés aux membres Premium.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Devenir Premium', onPress: onGoPremium }
        ]
      );
      return;
    }
    setFilters({ ...filters, [key]: !filters[key] });
  };

  const handleScoreFilter = (score: number) => {
    if (score > 0 && !isPremium) {
      Alert.alert('Privilège Premium 💎', 'Le filtrage par score de galanterie est une option Premium.');
      return;
    }
    setFilters({ ...filters, minScore: score });
  };
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.filterContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filtres de recherche
            </Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Je veux voir</Text>
            <View style={styles.filterRow}>
              {['MALE', 'FEMALE', 'ALL'].map((g) => (
                <Pressable
                  key={g}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.input, borderColor: colors.border },
                    filters.gender === g && styles.filterChipActive,
                  ]}
                  onPress={() => setFilters({ ...filters, gender: g })}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.textMuted },
                      filters.gender === g && styles.filterChipTextActive,
                    ]}
                  >
                    {g === 'MALE' ? 'Hommes' : g === 'FEMALE' ? 'Femmes' : 'Tous'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>
              Âge : {filters.minAge} - {filters.maxAge} ans
            </Text>
            <View style={styles.ageInputs}>
              <TextInput
                style={[styles.ageInput, { backgroundColor: colors.input, color: colors.text }]}
                keyboardType="numeric"
                value={String(filters.minAge)}
                onChangeText={(v) => setFilters({ ...filters, minAge: parseInt(v) || 18 })}
                placeholder="Min"
              />
              <Text style={[styles.ageDash, { color: colors.textMuted }]}>à</Text>
              <TextInput
                style={[styles.ageInput, { backgroundColor: colors.input, color: colors.text }]}
                keyboardType="numeric"
                value={String(filters.maxAge)}
                onChangeText={(v) => setFilters({ ...filters, maxAge: parseInt(v) || 50 })}
                placeholder="Max"
              />
            </View>

            <Text style={[styles.filterLabel, { color: colors.text }]}>Ville</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text }]}
              value={filters.city}
              onChangeText={(v) => setFilters({ ...filters, city: v })}
              placeholder="Ex: Abidjan"
              autoCapitalize="words"
            />

            <Text style={[styles.filterLabel, { color: colors.text }]}>
              Distance max : {filters.maxDistanceKm} km
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.text }]}
              keyboardType="numeric"
              value={String(filters.maxDistanceKm)}
              onChangeText={(v) =>
                setFilters({ ...filters, maxDistanceKm: Math.max(1, parseInt(v, 10) || 1) })
              }
              placeholder="Ex: 50"
            />

            {/* HIGH STANDING FILTERS */}
            <View style={styles.premiumSection}>
              <Text style={[styles.filterLabel, { color: COLORS.primary }]}>Critères de standing 💎</Text>

              <Pressable
                onPress={() => handlePremiumFilter('premiumOnly')}
                style={[styles.premiumOption, filters.premiumOnly && styles.premiumOptionActive]}
              >
                <View style={styles.premiumOptionText}>
                  <Text style={[styles.optionTitle, filters.premiumOnly && { color: '#fff' }]}>Membres Premium uniquement</Text>
                  <Text style={[styles.optionSub, filters.premiumOnly && { color: 'rgba(255,255,255,0.7)' }]}>Ne voir que les profils avec le badge 💎</Text>
                </View>
                <View style={[styles.checkbox, filters.premiumOnly && styles.checkboxActive]}>
                  {filters.premiumOnly && <CheckCircle size={16} color="#fff" />}
                </View>
              </Pressable>

              <Pressable
                onPress={() => handlePremiumFilter('verifiedOnly')}
                style={[styles.premiumOption, filters.verifiedOnly && styles.premiumOptionActive]}
              >
                <View style={styles.premiumOptionText}>
                  <Text style={[styles.optionTitle, filters.verifiedOnly && { color: '#fff' }]}>Profils Certifiés uniquement</Text>
                  <Text style={[styles.optionSub, filters.verifiedOnly && { color: 'rgba(255,255,255,0.7)' }]}>Ne voir que l'élite vérifiée</Text>
                </View>
                <View style={[styles.checkbox, filters.verifiedOnly && styles.checkboxActive]}>
                  {filters.verifiedOnly && <CheckCircle size={16} color="#fff" />}
                </View>
              </Pressable>

              <Text style={[styles.filterLabel, { marginTop: 24 }]}>Score minimum : {filters.minScore || 0}</Text>
              <View style={styles.scoreRow}>
                 {[0, 4, 4.5, 4.8].map((s) => (
                   <Pressable
                     key={s}
                     onPress={() => handleScoreFilter(s)}
                     style={[styles.scoreChip, filters.minScore === s && styles.scoreChipActive]}
                   >
                     <Text style={[styles.scoreText, filters.minScore === s && { color: '#fff' }]}>{s === 0 ? 'Tous' : `${s}+`}</Text>
                   </Pressable>
                 ))}
              </View>
            </View>

            <Pressable style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  ageInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  ageDash: {
    fontWeight: '700',
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  premiumSection: {
    marginTop: 32,
    gap: 12,
  },
  premiumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  premiumOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  premiumOptionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
  },
  optionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: 'rgba(255,255,255,0.4)',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  scoreChipActive: {
    backgroundColor: '#0f172a',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
  },
});

export default MatchmakingFilters;
