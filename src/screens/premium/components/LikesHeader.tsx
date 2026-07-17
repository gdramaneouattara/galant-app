import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../../data/mock';

interface LikesHeaderProps {
  onBack: () => void;
}

const LikesHeader: React.FC<LikesHeaderProps> = ({ onBack }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Boîte de Roses</Text>
        <Text style={styles.subtitle}>Les roses reçues restent séparées des matchs et des messages.</Text>
      </View>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Retour</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  backButtonText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
});

export default LikesHeader;
