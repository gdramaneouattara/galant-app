import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../../../data/mock';

interface EmptyLikesStateProps {
  loading: boolean;
  error: string | null;
}

const EmptyLikesState: React.FC<EmptyLikesStateProps> = ({ loading, error }) => {
  return (
    <View style={styles.centered}>
      {loading ? (
        <>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.hint}>Chargement...</Text>
        </>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.hint}>Aucune rose reçue pour le moment.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  hint: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default EmptyLikesState;
