import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { CircleEllipsis, Cross, Moon } from 'lucide-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS } from '../../../data/mock';
import { useApp } from '../../../state/AppContext';

const RELIGION_OPTIONS = [
  { id: 'CHRISTIAN', label: 'Chrétien(ne)', icon: Cross },
  { id: 'MUSLIM', label: 'Musulman(e)', icon: Moon },
  { id: 'OTHER', label: 'Autre', icon: CircleEllipsis },
];

interface ReligionStepProps {
  form: any;
  setForm: (form: any) => void;
  onNext: () => void;
}

const ReligionStep: React.FC<ReligionStepProps> = ({ form, setForm, onNext }) => {
  const { colors } = useApp();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Religion</Text>
      <Text style={[styles.caption, { color: colors.textMuted }]}>
        Choisissez l'information qui vous correspond. La précision est facultative.
      </Text>

      <View style={styles.options}>
        {RELIGION_OPTIONS.map((option) => {
          const active = form.religion === option.id;
          const Icon = option.icon;
          return (
            <Pressable
              key={option.id}
              onPress={() => setForm({ ...form, religion: option.id })}
              style={[
                styles.option,
                { backgroundColor: colors.input, borderColor: colors.border },
                active && styles.optionActive,
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
                <Icon size={24} color={active ? COLORS.primary : colors.textMuted} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }, active && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {form.religion === 'OTHER' && (
        <TextInput
          value={form.religionOther}
          onChangeText={(value) => setForm({ ...form, religionOther: value })}
          placeholder="Préciser, facultatif"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
        />
      )}

      <PrimaryButton label="Continuer" onPress={onNext} disabled={!form.religion} />
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
    lineHeight: 22,
  },
  options: {
    gap: 12,
  },
  option: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionActive: {
    borderColor: COLORS.primary,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  optionTextActive: {
    color: COLORS.primary,
  },
  input: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ReligionStep;
