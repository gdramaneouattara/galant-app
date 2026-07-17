import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../../data/mock';

type FilterKey = 'ALL' | 'SUSPENDED' | 'PREMIUM' | 'UNVERIFIED' | 'ADMINS';

interface AdminFilterBarProps {
  activeFilter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  counts: Record<FilterKey, number>;
}

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'Tous' },
  { key: 'SUSPENDED', label: 'Suspendus' },
  { key: 'PREMIUM', label: 'Premium' },
  { key: 'UNVERIFIED', label: 'Non vérifiés' },
  { key: 'ADMINS', label: 'Admins' },
];

const AdminFilterBar: React.FC<AdminFilterBarProps> = ({ activeFilter, onFilterChange, counts }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
      {FILTERS.map((filter) => {
        const selected = filter.key === activeFilter;
        return (
          <Pressable
            key={filter.key}
            style={[styles.filterChip, selected && styles.filterChipActive]}
            onPress={() => onFilterChange(filter.key)}
          >
            <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
              {filter.label} ({counts[filter.key]})
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filtersRow: { gap: 8, paddingVertical: 2 },
  filterChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe3ef', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  filterChipText: { color: COLORS.ink, fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#0369a1' },
});

export default AdminFilterBar;
