import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';

const INTERESTS_OPTIONS = [
  'Voyage', 'Musique', 'Cuisine', 'Gastronomie', 'Mode', 'Business', 'Tech', 'Art',
  'Cinéma', 'Lecture', 'Gaming', 'Danse', 'Nature', 'Yoga', 'Sorties', 'Bien-être',
];

interface InterestsStepProps {
  form: any;
  setForm: (form: any) => void;
  onNext: () => void;
}

const InterestsStep: React.FC<InterestsStepProps> = ({ form, setForm, onNext }) => {
  const { colors } = useApp();

  const toggleInterest = (interest: string) => {
    if (form.interests.includes(interest)) {
      setForm({ ...form, interests: form.interests.filter((i: string) => i !== interest) });
    } else if (form.interests.length < 5) {
      setForm({ ...form, interests: [...form.interests, interest] });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Tes centres d'intérêt</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>Choisis jusqu'à 5 centres d'intérêt.</Text>
      <View style={styles.wrap}>
        {INTERESTS_OPTIONS.map((interest) => {
          const active = form.interests.includes(interest);
          return (
            <Pressable
              key={interest}
              onPress={() => toggleInterest(interest)}
              style={[
                styles.tag,
                { backgroundColor: colors.input },
                active && styles.tagActive
              ]}
            >
              <Text style={[
                styles.tagText,
                { color: colors.textMuted },
                active && styles.tagTextActive
              ]}>{interest}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label="Continuer" onPress={onNext} disabled={form.interests.length === 0} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  caption: {
    fontSize: 14,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tagActive: {
    backgroundColor: COLORS.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagTextActive: {
    color: '#fff',
  },
});

export default InterestsStep;
