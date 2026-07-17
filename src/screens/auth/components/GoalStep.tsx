import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';
import { Heart, Users, Coffee } from 'lucide-react-native';

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Amour sérieux', icon: (props: any) => <Heart {...props} /> },
  { id: 'FRIENDSHIP', label: 'Amitié', icon: (props: any) => <Users {...props} /> },
  { id: 'CASUAL', label: 'On verra bien', icon: (props: any) => <Coffee {...props} /> },
];

interface GoalStepProps {
  form: any;
  setForm: (form: any) => void;
  onNext: () => void;
}

const GoalStep: React.FC<GoalStepProps> = ({ form, setForm, onNext }) => {
  const { colors } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Que cherches-tu sur Galant ?</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>Sois honnête sur tes intentions.</Text>
      <View style={styles.goalList}>
        {RELATIONSHIP_GOALS.map((goal) => {
          const active = form.relationshipGoal === goal.id;
          return (
            <Pressable
              key={goal.id}
              style={[
                styles.goalCard,
                { backgroundColor: colors.input, borderColor: colors.border },
                active && styles.goalCardActive
              ]}
              onPress={() => setForm({ ...form, relationshipGoal: goal.id })}
            >
              <View style={[
                styles.goalIconWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
                active && styles.goalIconWrapActive
              ]}>
                {goal.icon({ color: active ? '#fff' : COLORS.primary, size: 24 })}
              </View>
              <Text style={[
                styles.goalLabel,
                { color: colors.text },
                active && styles.goalLabelActive
              ]}>{goal.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton label="Continuer" onPress={onNext} />
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
  goalList: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
  },
  goalCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff', // Or keep theme based but highlight
    borderWidth: 2,
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  goalIconWrapActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalLabelActive: {
    color: COLORS.primary,
  },
});

export default GoalStep;
