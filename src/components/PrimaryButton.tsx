import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, ActivityIndicator, View } from 'react-native';
import { COLORS } from '../data/mock';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  loading?: boolean;
  icon?: ReactNode;
};

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ label, onPress, disabled, style, loading, icon }) => {
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
        <View style={styles.container}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={styles.label}>{label}</Text>
        </View>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PrimaryButton;
