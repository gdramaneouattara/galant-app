import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, ActivityIndicator } from 'react-native';
import { COLORS } from '../data/mock';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  loading?: boolean;
};

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ label, onPress, disabled, style, loading }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PrimaryButton;
