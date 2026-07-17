import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { Gender } from '../../../types';
import { useApp } from '../../../state/AppContext';

interface IdentityStepProps {
  form: any;
  setForm: (form: any) => void;
  onNext: () => void;
}

const IdentityStep: React.FC<IdentityStepProps> = ({ form, setForm, onNext }) => {
  const { colors } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>C'est quoi ton petit nom ?</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>C'est ainsi que tes futurs matchs te verront.</Text>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Prénom</Text>
        <TextInput
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
          placeholder="Ton prénom"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
        />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Âge</Text>
        <TextInput
          value={form.age}
          onChangeText={(text) => setForm({ ...form, age: text })}
          placeholder="18+"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
        />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Genre</Text>
        <View style={styles.row}>
          {[Gender.FEMALE, Gender.MALE].map((gender) => (
            <Pressable
              key={gender}
              onPress={() => setForm({ ...form, gender })}
              style={[
                styles.choiceButton,
                { borderColor: colors.border },
                form.gender === gender && styles.choiceButtonActive
              ]}
            >
              <Text style={[
                styles.choiceLabel,
                { color: colors.text },
                form.gender === gender && styles.choiceLabelActive
              ]}>
                {gender === Gender.FEMALE ? 'Femme' : 'Homme'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <PrimaryButton
        label="Continuer"
        onPress={onNext}
        disabled={!form.name || !form.age || Number(form.age) < 18}
      />
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
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  choiceButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  choiceLabel: {
    fontWeight: '700',
  },
  choiceLabelActive: {
    color: '#fff',
  },
});

export default IdentityStep;
