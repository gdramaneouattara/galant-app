import React from 'react';
import { Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { useApp } from '../../../state/AppContext';

interface BioStepProps {
  form: any;
  setForm: (form: any) => void;
  onNext: () => void;
}

const BioStep: React.FC<BioStepProps> = ({ form, setForm, onNext }) => {
  const { colors } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Un petit mot sur toi</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>Sois authentique, ça aide à matcher.</Text>
      <TextInput
        value={form.bio}
        onChangeText={(text) => setForm({ ...form, bio: text })}
        placeholder="Écris une courte bio..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={[
          styles.input,
          styles.textArea,
          { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }
        ]}
      />
      <PrimaryButton label="Continuer" onPress={onNext} disabled={!form.bio} />
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
  input: {
    borderRadius: 16,
    minHeight: 52,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
});

export default BioStep;
