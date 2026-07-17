import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { X, Heart, Users, Coffee } from 'lucide-react-native';
import { COLORS } from '../../../data/mock';

const RELATIONSHIP_GOALS = [
  { id: 'SERIOUS', label: 'Amour sérieux', icon: (props: any) => <Heart {...props} /> },
  { id: 'FRIENDSHIP', label: 'Amitié', icon: (props: any) => <Users {...props} /> },
  { id: 'CASUAL', label: 'On verra bien', icon: (props: any) => <Coffee {...props} /> },
];

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  currentGoalId: string;
  onUpdateGoal: (goalId: string) => void;
  colors: any;
}

const GoalModal: React.FC<GoalModalProps> = ({
  visible,
  onClose,
  currentGoalId,
  onUpdateGoal,
  colors,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Que cherches-tu ?</Text>
            <Pressable onPress={onClose}>
              <X color={colors.textMuted} size={24} />
            </Pressable>
          </View>
          <View style={styles.goalList}>
            {RELATIONSHIP_GOALS.map((goal) => {
              const active = currentGoalId === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                    active && styles.goalCardActive
                  ]}
                  onPress={() => onUpdateGoal(goal.id)}
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
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
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

export default GoalModal;
